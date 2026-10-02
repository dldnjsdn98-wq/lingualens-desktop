using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Windows.Forms;

internal static class Launcher {
  [STAThread]
  private static void Main() {
    Process server = null;
    bool startedServer = false;
    try {
      string root = AppDomain.CurrentDomain.BaseDirectory;
      string[] arguments = Environment.GetCommandLineArgs();
      if (arguments.Length == 3 && arguments[1] == "--google-login") {
        string cli = Path.GetFullPath(arguments[2]);
        if (!File.Exists(cli) || !String.Equals(Path.GetFileName(cli), "agy.exe", StringComparison.OrdinalIgnoreCase)) throw new Exception("Antigravity 실행 파일을 찾지 못했습니다.");
        ProcessStartInfo login = new ProcessStartInfo(cli);
        login.UseShellExecute = true;
        login.WorkingDirectory = Path.GetDirectoryName(cli);
        login.WindowStyle = ProcessWindowStyle.Normal;
        Process.Start(login);
        return;
      }
      string node = Path.Combine(root, "node.exe");
      string script = Path.Combine(root, "src", "server.js");
      string edge = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "Edge", "Application", "msedge.exe");
      if (!File.Exists(edge)) edge = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft", "Edge", "Application", "msedge.exe");
      if (!File.Exists(node) || !File.Exists(script) || !File.Exists(edge)) throw new Exception("실행 파일 구성요소 또는 Microsoft Edge를 찾지 못했습니다.");
      bool selftest = Environment.GetCommandLineArgs().Length > 1 && Environment.GetCommandLineArgs()[1] == "--selftest";
      if (!selftest && File.Exists(Path.Combine(root, "LinguaLensUpdater.exe"))) {
        Process update = new Process();
        update.StartInfo.FileName = Path.Combine(root, "LinguaLensUpdater.exe");
        update.StartInfo.Arguments = "--check \"" + root.TrimEnd(Path.DirectorySeparatorChar) + "\" " + Process.GetCurrentProcess().Id;
        update.StartInfo.WorkingDirectory = root;
        update.StartInfo.UseShellExecute = false;
        update.StartInfo.CreateNoWindow = true;
        update.Start();
        Form notice = null;
        DateTime began = DateTime.UtcNow;
        while (!update.WaitForExit(100)) {
          if (notice == null && (DateTime.UtcNow - began).TotalMilliseconds > 700) {
            notice = new Form(); notice.Text = "Language Test 업데이트"; notice.Width = 360; notice.Height = 110; notice.StartPosition = FormStartPosition.CenterScreen; notice.ControlBox = false;
            Label label = new Label(); label.Text = "새 버전을 확인하고 있습니다…"; label.Dock = DockStyle.Fill; label.TextAlign = System.Drawing.ContentAlignment.MiddleCenter; notice.Controls.Add(label); notice.Show();
          }
          Application.DoEvents();
        }
        if (notice != null) notice.Close();
        int updateCode = update.ExitCode; update.Dispose();
        if (updateCode == 10) return;
      }
      System.Net.Sockets.TcpListener listener = new System.Net.Sockets.TcpListener(System.Net.IPAddress.Loopback, 0);
      listener.Start();
      int port = ((System.Net.IPEndPoint)listener.LocalEndpoint).Port;
      listener.Stop();
      string url = "http://127.0.0.1:" + port;
      {
        server = new Process();
        server.StartInfo.FileName = node;
        server.StartInfo.Arguments = "\"" + script + "\" " + port;
        server.StartInfo.WorkingDirectory = root;
        server.StartInfo.UseShellExecute = true;
        server.StartInfo.CreateNoWindow = true;
        server.StartInfo.WindowStyle = ProcessWindowStyle.Hidden;
        server.Start();
        startedServer = true;
        bool ready = false;
        for (int i = 0; i < 50; i++) {
          if (Healthy(url)) { ready = true; break; }
          if (server.HasExited) break;
          System.Threading.Thread.Sleep(100);
        }
        if (!ready) throw new Exception("앱 서버를 시작하지 못했습니다. 로컬 포트를 확인하세요.");
      }
      if (selftest) {
        if (startedServer && server != null && !server.HasExited) server.Kill();
        return;
      }
      string profile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "LinguaLens", "EdgeProfile");
      Directory.CreateDirectory(profile);
      Process browser = Process.Start(new ProcessStartInfo(edge, "--no-first-run --user-data-dir=\"" + profile + "\" --app=\"" + url + "\" --new-window"));
      if (browser == null) throw new Exception("앱 창을 열지 못했습니다.");
    } catch (Exception error) {
      MessageBox.Show(error.Message, "Language Test", MessageBoxButtons.OK, MessageBoxIcon.Error);
    } finally {
      if (server != null) server.Dispose();
    }
  }

  private static bool Healthy(string url) {
    try {
      using (WebClient client = new WebClient()) {
        string health = client.DownloadString(url + "/healthz");
        return health.Contains("\"app\":\"LinguaLens-desktop-v1\"");
      }
    } catch { return false; }
  }
}
