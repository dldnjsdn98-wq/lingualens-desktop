using System;
using System.IO;
using System.Text;
using System.Windows.Forms;
class FolderPicker {
 [STAThread] static void Main(string[] args) {
  if(args.Length!=1)return;
  Application.EnableVisualStyles();
  using(var dialog=new FolderBrowserDialog()) {
   dialog.Description="Language Test에 자동으로 가져올 이미지 폴더를 선택하세요.";
   dialog.ShowNewFolderButton=false;
   File.WriteAllText(args[0],dialog.ShowDialog()==DialogResult.OK?dialog.SelectedPath:"",new UTF8Encoding(false));
  }
 }
}
