using System;
using System.IO;
using System.Windows.Forms;
using System.Runtime.InteropServices;
using System.Net;
using System.Collections.Generic;
using System.Web.Script.Serialization;
using System.Diagnostics;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new PlannerWindow());
    }
}

internal sealed class PlannerWindow : Form
{
    private const string AppVersion = "2.3.1";
    private const string LatestReleaseApi = "https://api.github.com/repos/TAKO-77/SyncroApp/releases/latest";
    private readonly WebView2 view = new WebView2();

    public PlannerWindow()
    {
        Text = "Syncro";
        Width = 1920;
        Height = 1200;
        MinimumSize = new System.Drawing.Size(720, 560);
        StartPosition = FormStartPosition.CenterScreen;
        WindowState = FormWindowState.Maximized;
        // Read the icon file directly: shell extraction may return an older cached icon.
        string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Syncro-brand-amber-transparent.ico");
        Icon = File.Exists(iconPath)
            ? new System.Drawing.Icon(iconPath, new System.Drawing.Size(32, 32))
            : System.Drawing.Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        view.Dock = DockStyle.Fill;
        Controls.Add(view);
        Shown += async (sender, args) => await StartPlanner();
    }

    protected override void OnHandleCreated(EventArgs e)
    {
        base.OnHandleCreated(e);
        int dark = 1;
        int result = DwmSetWindowAttribute(Handle, 20, ref dark, sizeof(int));
        if (result != 0) DwmSetWindowAttribute(Handle, 19, ref dark, sizeof(int));
        int caption = 0x00171A19;
        DwmSetWindowAttribute(Handle, 35, ref caption, sizeof(int));
        int border = 0x002B2E2D;
        DwmSetWindowAttribute(Handle, 34, ref border, sizeof(int));
    }

    [DllImport("dwmapi.dll", PreserveSig = true)]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int valueSize);

    private async System.Threading.Tasks.Task StartPlanner()
    {
        // Aceita tanto a distribuição plana como a saída de desenvolvimento em dist.
        string folder = AppDomain.CurrentDomain.BaseDirectory;
        string html = Path.Combine(folder, "index.html");
        if (!File.Exists(html))
        {
            folder = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "dist");
            html = Path.Combine(folder, "index.html");
        }
        if (!File.Exists(html))
        {
            MessageBox.Show(this, "Não foi encontrado o index.html junto da aplicação nem na pasta dist.", "Syncro", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
            return;
        }
        // Pasta de dados mantida como "Planner" para preservar os dados já guardados.
        string profile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Planner", "WebView2");
        var environment = await CoreWebView2Environment.CreateAsync(null, profile);
        await view.EnsureCoreWebView2Async(environment);
        view.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
        view.CoreWebView2.Settings.IsStatusBarEnabled = false;
        view.CoreWebView2.Settings.AreDevToolsEnabled = false;
        view.CoreWebView2.SetVirtualHostNameToFolderMapping("planner.local", folder, CoreWebView2HostResourceAccessKind.Allow);
        view.Source = new Uri("https://planner.local/index.html");
        await CheckForUpdates();
    }

    private async System.Threading.Tasks.Task CheckForUpdates()
    {
        try
        {
            using (var client = new UpdateWebClient())
            {
                client.Headers[HttpRequestHeader.UserAgent] = "Syncro-Updater";
                client.Headers[HttpRequestHeader.Accept] = "application/vnd.github+json";
                string json = await client.DownloadStringTaskAsync(LatestReleaseApi);
                var release = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(json);
                string tag = Convert.ToString(release["tag_name"]).TrimStart('v', 'V');
                Version latest, current;
                if (!Version.TryParse(tag, out latest) || !Version.TryParse(AppVersion, out current) || latest <= current) return;

                string installerUrl = null;
                foreach (var asset in (object[])release["assets"])
                {
                    var item = asset as Dictionary<string, object>;
                    if (item != null && String.Equals(Convert.ToString(item["name"]), "SyncroSetup.exe", StringComparison.OrdinalIgnoreCase))
                    {
                        installerUrl = Convert.ToString(item["browser_download_url"]);
                        break;
                    }
                }
                if (String.IsNullOrEmpty(installerUrl)) return;

                if (MessageBox.Show(this, "Está disponível a versão " + latest + " do Syncro. Queres instalar a atualização agora?", "Atualização do Syncro", MessageBoxButtons.YesNo, MessageBoxIcon.Information) != DialogResult.Yes) return;
                string installerPath = Path.Combine(Path.GetTempPath(), "SyncroSetup-" + latest + ".exe");
                using (var download = new UpdateWebClient())
                {
                    download.Headers[HttpRequestHeader.UserAgent] = "Syncro-Updater";
                    await download.DownloadFileTaskAsync(installerUrl, installerPath);
                }
                Process.Start(new ProcessStartInfo(installerPath) { UseShellExecute = true });
                Close();
            }
        }
        catch (Exception ex)
        {
            // A falta de ligação ou uma falha no serviço de versões não impede o uso da app.
            System.Diagnostics.Debug.WriteLine("Falha ao procurar atualizações: " + ex.Message);
        }
    }

    private sealed class UpdateWebClient : WebClient
    {
        protected override WebRequest GetWebRequest(Uri address)
        {
            var request = base.GetWebRequest(address);
            request.Timeout = 10000;
            return request;
        }
    }
}
