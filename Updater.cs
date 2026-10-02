using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

internal static class Updater {
  private const long MaxDownload = 250L * 1024 * 1024;
  private const long MaxExtract = 700L * 1024 * 1024;
  private static string dataRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "LinguaLens", "updates");
  private static int Main(string[] args) {
    try {
      ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
      if (args.Length == 3 && args[0] == "--check") return Check(args[1], int.Parse(args[2]));
      if (args.Length == 4 && args[0] == "--apply") return Apply(args[1], args[2], int.Parse(args[3]));
      if (args.Length == 3 && args[0] == "--verify") { VerifyZip(args[1], args[2]); return 0; }
      if (args.Length == 4 && args[0] == "--verify-package") { VerifyPackage(args[1], args[2], ParseVersion(args[3])); return 0; }
      return 1;
    } catch (Exception error) { Log(error); return 1; }
  }
  private static void Log(Exception error) {
    try { Directory.CreateDirectory(dataRoot); File.AppendAllText(Path.Combine(dataRoot, "update.log"), DateTime.UtcNow.ToString("u") + " " + error.Message + Environment.NewLine); } catch {}
  }
  private static Dictionary<string, object> Obj(object value) { return value as Dictionary<string, object>; }
  private static string Str(Dictionary<string, object> value, string key) { object field; return value != null && value.TryGetValue(key, out field) && field != null ? field.ToString() : ""; }
  private static Version ParseVersion(string text) { return new Version(text.Trim().TrimStart('v', 'V')); }
  private static string ReadUrl(string url, int maxBytes) {
    HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
    request.UserAgent = "LinguaLens-Windows-Updater";
    request.Accept = "application/vnd.github+json";
    request.Timeout = 6000;
    request.ReadWriteTimeout = 6000;
    using (HttpWebResponse response = (HttpWebResponse)request.GetResponse()) {
      if (response.ResponseUri.Scheme != Uri.UriSchemeHttps) throw new Exception("HTTPS 업데이트 주소가 아닙니다.");
      using (Stream input = response.GetResponseStream()) using (MemoryStream output = new MemoryStream()) {
        byte[] buffer = new byte[8192]; int n;
        while ((n = input.Read(buffer, 0, buffer.Length)) > 0) { output.Write(buffer, 0, n); if (output.Length > maxBytes) throw new Exception("업데이트 응답이 너무 큽니다."); }
        return Encoding.UTF8.GetString(output.ToArray());
      }
    }
  }
  private static int Check(string root, int parentPid) {
    string configPath = Path.Combine(root, "release-channel.json"), versionPath = Path.Combine(root, "version.txt");
    if (!File.Exists(configPath) || !File.Exists(versionPath)) return 0;
    try {
      Dictionary<string, object> config = Obj(new JavaScriptSerializer().DeserializeObject(File.ReadAllText(configPath, Encoding.UTF8)));
      string repository = Str(config, "repository"), assetName = Str(config, "asset");
      if (!System.Text.RegularExpressions.Regex.IsMatch(repository, @"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$") || assetName != "LinguaLens-Windows.zip") return 0;
      string url = "https://api.github.com/repos/" + repository + "/releases/latest";
      Dictionary<string, object> release = Obj(new JavaScriptSerializer().DeserializeObject(ReadUrl(url, 2000000)));
      Version current = ParseVersion(File.ReadAllText(versionPath));
      Version latest = ParseVersion(Str(release, "tag_name"));
      if (latest <= current || Str(release, "draft") == "True" || Str(release, "prerelease") == "True") return 0;
      object assetsObject;
      if (!release.TryGetValue("assets", out assetsObject)) return 0;
      object[] assets = assetsObject as object[];
      if (assets == null) return 0;
      foreach (object entry in assets) {
        Dictionary<string, object> asset = Obj(entry);
        if (Str(asset, "name") != assetName) continue;
        string digest = Str(asset, "digest"), downloadUrl = Str(asset, "browser_download_url");
        if (!System.Text.RegularExpressions.Regex.IsMatch(digest, @"^sha256:[a-fA-F0-9]{64}$")) return 0;
        string expectedPrefix = "https://github.com/" + repository + "/releases/download/";
        if (!downloadUrl.StartsWith(expectedPrefix, StringComparison.OrdinalIgnoreCase)) return 0;
        long size = long.Parse(Str(asset, "size"));
        if (size <= 0 || size > MaxDownload) return 0;
        string stage = Path.Combine(dataRoot, latest.ToString() + "-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(stage);
        string zip = Path.Combine(stage, "update.zip"), app = Path.Combine(stage, "app");
        try {
          Download(downloadUrl, zip, size);
          VerifyZip(zip, digest.Substring(7));
          Extract(zip, app);
          ValidateApp(app, latest);
          string helper = Path.Combine(stage, "ApplyUpdate.exe");
          File.Copy(Process.GetCurrentProcess().MainModule.FileName, helper);
          ProcessStartInfo start = new ProcessStartInfo(helper, "--apply \"" + app + "\" \"" + root + "\" " + parentPid);
          start.UseShellExecute = true; start.WindowStyle = ProcessWindowStyle.Hidden;
          Process.Start(start);
          return 10;
        } catch { try { Directory.Delete(stage, true); } catch {} throw; }
      }
      return 0;
    } catch (WebException) { return 0; } catch (Exception error) { Log(error); return 0; }
  }
  private static void Download(string url, string path, long expectedSize) {
    HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
    request.UserAgent = "LinguaLens-Windows-Updater";
    request.Timeout = 15000; request.ReadWriteTimeout = 30000;
    using (HttpWebResponse response = (HttpWebResponse)request.GetResponse()) {
      if (response.ResponseUri.Scheme != Uri.UriSchemeHttps) throw new Exception("다운로드가 HTTPS가 아닙니다.");
      using (Stream input = response.GetResponseStream()) using (FileStream output = File.Create(path)) {
        byte[] buffer = new byte[65536]; int n; long total = 0;
        while ((n = input.Read(buffer, 0, buffer.Length)) > 0) { total += n; if (total > MaxDownload) throw new Exception("다운로드가 너무 큽니다."); output.Write(buffer, 0, n); }
        if (total != expectedSize) throw new Exception("다운로드 크기가 일치하지 않습니다.");
      }
    }
  }
  private static void VerifyZip(string path, string expectedHash) {
    string actual;
    using (SHA256 sha = SHA256.Create()) using (FileStream input = File.OpenRead(path)) actual = BitConverter.ToString(sha.ComputeHash(input)).Replace("-", "");
    if (!actual.Equals(expectedHash, StringComparison.OrdinalIgnoreCase)) throw new Exception("배포 ZIP의 SHA-256 해시가 일치하지 않습니다.");
  }
  private static void VerifyPackage(string path, string expectedHash, Version expectedVersion) {
    VerifyZip(path, expectedHash);
    string stage = Path.Combine(dataRoot, "verify-" + Guid.NewGuid().ToString("N"));
    try { Extract(path, stage); ValidateApp(stage, expectedVersion); }
    finally { try { Directory.Delete(stage, true); } catch {} }
  }
  private static void ValidateApp(string app, Version latest) {
    if (!File.Exists(Path.Combine(app, "LinguaLens.exe")) || !File.Exists(Path.Combine(app, "LinguaLensUpdater.exe")) || !File.Exists(Path.Combine(app, "node.exe")) || !File.Exists(Path.Combine(app, "src", "server.js")) || !File.Exists(Path.Combine(app, "vendor", "xlsx.full.min.js"))) throw new Exception("배포 ZIP에 필수 파일이 없습니다.");
    if (ParseVersion(File.ReadAllText(Path.Combine(app, "version.txt"))) != latest) throw new Exception("배포 버전이 일치하지 않습니다.");
    if (latest >= new Version(0, 3, 0) && (!File.Exists(Path.Combine(app, "vendor", "ocr", "python.exe")) || !File.Exists(Path.Combine(app, "vendor", "ocr", "manifest.json")) || !File.Exists(Path.Combine(app, "vendor", "Sortable.min.js")))) throw new Exception("로컬 OCR 배포 파일이 없습니다.");
    if (latest >= new Version(0, 3, 1) && (!File.Exists(Path.Combine(app, "src", "workspace-upgrade.js")) || !File.Exists(Path.Combine(app, "src", "codex-server.js")) || !File.Exists(Path.Combine(app, "vendor", "FILEPOND.min.js")) || !File.Exists(Path.Combine(app, "vendor", "FILEPOND.min.css")))) throw new Exception("작업 관리 배포 파일이 없습니다.");
    if (latest >= new Version(0, 3, 2) && (!File.Exists(Path.Combine(app, "src", "workbench-client.js")) || !File.Exists(Path.Combine(app, "src", "workbench-tools.js")) || !File.Exists(Path.Combine(app, "src", "workbench-styles.js")))) throw new Exception("작업 화면 배포 파일이 없습니다.");
    if (latest >= new Version(0, 4, 0) && (!File.Exists(Path.Combine(app, "src", "feature-client.js")) || !File.Exists(Path.Combine(app, "src", "feature-tools.js")) || !File.Exists(Path.Combine(app, "src", "feature-styles.js")) || !File.Exists(Path.Combine(app, "src", "folder-watch.js")) || !File.Exists(Path.Combine(app, "vendor", "pixelmatch.js")) || !File.Exists(Path.Combine(app, "LinguaLensFolderPicker.exe")))) throw new Exception("추가 기능 배포 파일이 없습니다.");
    if (latest >= new Version(0, 4, 1) && (!File.Exists(Path.Combine(app, "src", "platform.js")) || !File.Exists(Path.Combine(app, "src", "storage-maintenance.js")) || !File.Exists(Path.Combine(app, "src", "image-alignment.js")) || !File.Exists(Path.Combine(app, "src", "local-align-worker.py")))) throw new Exception("자동 정렬 및 저장 관리 배포 파일이 없습니다.");
    if (latest >= new Version(0, 4, 2) && (!File.Exists(Path.Combine(app, "src", "ux-client.js")) || !File.Exists(Path.Combine(app, "src", "ux-tools.js")) || !File.Exists(Path.Combine(app, "src", "ux-styles.js")))) throw new Exception("검수 화면 개선 배포 파일이 없습니다.");
  }
  private static void Extract(string path, string target) {
    Directory.CreateDirectory(target); long total = 0; int count = 0;
    using (ZipArchive archive = ZipFile.OpenRead(path)) foreach (ZipArchiveEntry entry in archive.Entries) {
      if (++count > 10000) throw new Exception("배포 ZIP에 파일이 너무 많습니다.");
      string name = entry.FullName.Replace('\\', '/');
      if (!name.StartsWith("LinguaLens/", StringComparison.Ordinal) || name.Contains("../") || name.Contains("/..") || name.Contains(":")) throw new Exception("배포 ZIP의 경로가 안전하지 않습니다.");
      string relative = name.Substring("LinguaLens/".Length);
      if (relative.Length == 0 || relative.EndsWith("/")) continue;
      total += entry.Length; if (entry.Length > MaxDownload || total > MaxExtract) throw new Exception("압축 해제 크기가 너무 큽니다.");
      string output = Path.GetFullPath(Path.Combine(target, relative.Replace('/', Path.DirectorySeparatorChar)));
      if (!output.StartsWith(Path.GetFullPath(target) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) throw new Exception("배포 ZIP의 경로가 안전하지 않습니다.");
      Directory.CreateDirectory(Path.GetDirectoryName(output));
      using (Stream input = entry.Open()) using (FileStream file = File.Create(output)) input.CopyTo(file);
    }
  }
  private static int Apply(string app, string target, int parentPid) {
    try {
      try { Process parent = Process.GetProcessById(parentPid); parent.WaitForExit(15000); } catch (ArgumentException) {}
      string node = Path.GetFullPath(Path.Combine(target, "node.exe"));
      string python = Path.GetFullPath(Path.Combine(target, "vendor", "ocr", "python.exe"));
      foreach (string name in new string[] { "node", "python" }) foreach (Process process in Process.GetProcessesByName(name)) {
        try { string executable = Path.GetFullPath(process.MainModule.FileName); if (string.Equals(executable, node, StringComparison.OrdinalIgnoreCase) || string.Equals(executable, python, StringComparison.OrdinalIgnoreCase)) { process.Kill(); process.WaitForExit(5000); } } catch {}
        finally { process.Dispose(); }
      }
      string backup = Path.Combine(Path.GetDirectoryName(app), "backup");
      Directory.CreateDirectory(backup);
      List<string> changed = new List<string>();
      try {
        foreach (string source in Directory.GetFiles(app, "*", SearchOption.AllDirectories)) {
          string relative = source.Substring(app.Length).TrimStart(Path.DirectorySeparatorChar);
          string dest = Path.Combine(target, relative), old = Path.Combine(backup, relative);
          Directory.CreateDirectory(Path.GetDirectoryName(dest));
          if (File.Exists(dest)) { Directory.CreateDirectory(Path.GetDirectoryName(old)); File.Copy(dest, old, true); }
          changed.Add(relative); File.Copy(source, dest, true);
        }
      } catch {
        foreach (string relative in changed) { string dest = Path.Combine(target, relative), old = Path.Combine(backup, relative); if (File.Exists(old)) File.Copy(old, dest, true); else File.Delete(dest); }
        throw;
      }
      Process.Start(new ProcessStartInfo(Path.Combine(target, "LinguaLens.exe")) { WorkingDirectory = target, UseShellExecute = true });
      return 0;
    } catch (Exception error) {
      Log(error);
      try { Process.Start(new ProcessStartInfo(Path.Combine(target, "LinguaLens.exe")) { WorkingDirectory = target, UseShellExecute = true }); } catch {}
      return 1;
    }
  }
}
