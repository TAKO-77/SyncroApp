using System;
using System.IO;
using System.Windows.Forms;
using System.Runtime.InteropServices;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Collections.Generic;
using System.Web.Script.Serialization;
using System.Diagnostics;
using System.Collections;
using System.Security.Cryptography;
using System.Reflection;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

[assembly: AssemblyVersion(PlannerWindow.AppVersion)]
[assembly: AssemblyFileVersion(PlannerWindow.AppVersion)]

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
        Application.Run(new PlannerWindow());
    }
}

internal sealed class PlannerWindow : Form
{
    internal const string AppVersion = "2.3.2";
    private const string LatestReleaseApi = "https://api.github.com/repos/TAKO-77/SyncroApp/releases/latest";
    private readonly WebView2 view = new WebView2();
    private bool checkingUpdates;

    public PlannerWindow()
    {
        Text = "Syncro";
        // Keep the restored window inside smaller screens instead of a fixed 1920x1200.
        var area = Screen.PrimaryScreen.WorkingArea;
        Width = Math.Min(1920, area.Width);
        Height = Math.Min(1200, area.Height);
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

    // Minimum window size in CSS pixels; wider than the 760px mobile breakpoint so the desktop layout never collapses.
    private const int MinLogicalWidth = 960;
    private const int MinLogicalHeight = 600;
    private const int WM_DPICHANGED = 0x02E0;

    private void ApplyMinimumSize()
    {
        // MinimumSize is in physical pixels under per-monitor DPI, so scale it to keep the same size inside the WebView.
        int dpi;
        try { dpi = GetDpiForWindow(Handle); }
        catch (EntryPointNotFoundException) { using (var g = CreateGraphics()) dpi = (int)g.DpiX; }
        float scale = Math.Max(1, dpi) / 96f;
        var area = Screen.FromHandle(Handle).WorkingArea;
        MinimumSize = new System.Drawing.Size(Math.Min((int)(MinLogicalWidth * scale), area.Width), Math.Min((int)(MinLogicalHeight * scale), area.Height));
    }

    protected override void WndProc(ref Message m)
    {
        base.WndProc(ref m);
        if (m.Msg == WM_DPICHANGED) ApplyMinimumSize();
    }

    protected override void OnHandleCreated(EventArgs e)
    {
        base.OnHandleCreated(e);
        ApplyMinimumSize();
        int dark = 1;
        int result = DwmSetWindowAttribute(Handle, 20, ref dark, sizeof(int));
        if (result != 0) DwmSetWindowAttribute(Handle, 19, ref dark, sizeof(int));
        int caption = 0x00171A19;
        DwmSetWindowAttribute(Handle, 35, ref caption, sizeof(int));
        int border = 0x002B2E2D;
        DwmSetWindowAttribute(Handle, 34, ref border, sizeof(int));
    }

    [DllImport("user32.dll")]
    private static extern int GetDpiForWindow(IntPtr hwnd);

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
        view.CoreWebView2.NewWindowRequested += (sender, args) =>
        {
            args.Handled = true;
            Uri target;
            if (!Uri.TryCreate(args.Uri, UriKind.Absolute, out target) || (target.Scheme != Uri.UriSchemeHttps && target.Scheme != Uri.UriSchemeHttp)) return;
            var isReleases = target.AbsoluteUri == "https://github.com/TAKO-77/SyncroApp/releases/latest";
            try { Process.Start(new ProcessStartInfo(target.AbsoluteUri) { UseShellExecute = true }); }
            catch (Exception ex)
            {
                LogUpdateFailure(ex);
                if (isReleases) PublishUpdateStatus("Não foi possível abrir o navegador. Visita as releases do Syncro no GitHub.", false);
            }
        };
        view.CoreWebView2.WebMessageReceived += async (sender, args) =>
        {
            if (!args.Source.StartsWith("https://planner.local/", StringComparison.OrdinalIgnoreCase)) return;
            string message;
            try { message = args.TryGetWebMessageAsString(); }
            catch (ArgumentException) { return; }
            if (message == "syncro:check-for-updates") await CheckForUpdates(true);
            else if (message == "syncro:version") PublishUpdateStatus("", checkingUpdates);
            else if (message == "syncro:oauth-listen") await ListenForOAuthCallback();
        };
        view.Source = new Uri("https://planner.local/index.html");
        await CheckForUpdates();
    }

    private void PublishUpdateStatus(string message, bool busy)
    {
        if (IsDisposed || Disposing || view.CoreWebView2 == null) return;
        view.CoreWebView2.PostWebMessageAsJson(new JavaScriptSerializer().Serialize(new {
            type = "syncro:update-status", version = AppVersion, message = message, busy = busy,
        }));
    }

    // OAuth providers refuse embedded WebViews, so sign-in runs in the system browser and Supabase
    // redirects back to this loopback address with a one-time PKCE code for the page to exchange.
    private const int OAuthPort = 47821;
    private TcpListener oauthListener;

    private async System.Threading.Tasks.Task ListenForOAuthCallback()
    {
        if (oauthListener != null) oauthListener.Stop();
        var listener = new TcpListener(IPAddress.Loopback, OAuthPort);
        try { listener.Start(); }
        catch (SocketException ex) { LogUpdateFailure(ex); PublishOAuthResult(null, "port_unavailable"); return; }
        oauthListener = listener;
        var timeout = new System.Threading.Timer(state => listener.Stop(), null, 5 * 60 * 1000, System.Threading.Timeout.Infinite);
        try
        {
            while (true)
            {
                using (var client = await listener.AcceptTcpClientAsync())
                {
                    var stream = client.GetStream();
                    var reader = new StreamReader(stream, Encoding.ASCII);
                    string requestLine = await reader.ReadLineAsync() ?? "";
                    string[] parts = requestLine.Split(' ');
                    string target = parts.Length > 1 ? parts[1] : "";
                    if (!target.StartsWith("/auth/callback", StringComparison.Ordinal))
                    {
                        await WriteHttpResponse(stream, "404 Not Found", "");
                        continue;
                    }
                    var query = ParseQuery(target.Contains("?") ? target.Substring(target.IndexOf('?') + 1) : "");
                    string code, error, description;
                    query.TryGetValue("code", out code);
                    query.TryGetValue("error", out error);
                    query.TryGetValue("error_description", out description);
                    await WriteHttpResponse(stream, "200 OK", code != null
                        ? "<h2>Sessão iniciada</h2><p>Podes fechar este separador e voltar ao Syncro.</p>"
                        : "<h2>Não foi possível iniciar sessão</h2><p>Volta ao Syncro e tenta novamente.</p>");
                    PublishOAuthResult(code, code != null ? null : (error ?? "unknown") + (description != null ? ": " + description : ""));
                    if (WindowState == FormWindowState.Minimized) WindowState = FormWindowState.Maximized;
                    Activate();
                    break;
                }
            }
        }
        catch (ObjectDisposedException) { }
        catch (SocketException) { }
        catch (InvalidOperationException) { }
        catch (IOException) { }
        finally
        {
            timeout.Dispose();
            listener.Stop();
            if (oauthListener == listener) oauthListener = null;
        }
    }

    private static Dictionary<string, string> ParseQuery(string query)
    {
        var values = new Dictionary<string, string>();
        foreach (string pair in query.Split('&'))
        {
            if (pair.Length == 0) continue;
            int eq = pair.IndexOf('=');
            string key = Uri.UnescapeDataString((eq < 0 ? pair : pair.Substring(0, eq)).Replace('+', ' '));
            string value = eq < 0 ? "" : Uri.UnescapeDataString(pair.Substring(eq + 1).Replace('+', ' '));
            values[key] = value;
        }
        return values;
    }

    private static async System.Threading.Tasks.Task WriteHttpResponse(Stream stream, string status, string body)
    {
        byte[] content = Encoding.UTF8.GetBytes("<!doctype html><html lang=\"pt\"><meta charset=\"utf-8\"><title>Syncro</title>"
            + "<body style=\"font-family:Segoe UI,sans-serif;background:#1c1e1e;color:#f3f4f6;text-align:center;padding-top:15vh\">" + body + "</body></html>");
        byte[] head = Encoding.ASCII.GetBytes("HTTP/1.1 " + status + "\r\nContent-Type: text/html; charset=utf-8\r\nCache-Control: no-store\r\nConnection: close\r\nContent-Length: " + content.Length + "\r\n\r\n");
        await stream.WriteAsync(head, 0, head.Length);
        await stream.WriteAsync(content, 0, content.Length);
    }

    private void PublishOAuthResult(string code, string error)
    {
        if (IsDisposed || Disposing || view.CoreWebView2 == null) return;
        view.CoreWebView2.PostWebMessageAsJson(new JavaScriptSerializer().Serialize(new { type = "syncro:oauth", code = code, error = error }));
    }

    private static void LogUpdateFailure(Exception error)
    {
        try
        {
            string folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Syncro");
            Directory.CreateDirectory(folder);
            string path = Path.Combine(folder, "updates.log");
            // Bound the log so repeated offline starts do not fill the profile.
            if (File.Exists(path) && new FileInfo(path).Length > 262144) File.WriteAllText(path, "");
            File.AppendAllText(path, DateTime.UtcNow.ToString("o") + " " + error.GetType().Name + ": " + error.Message + Environment.NewLine);
        }
        catch { /* Logging must never prevent the app from opening. */ }
    }

    private sealed class UpdateInfo
    {
        public Version Version;
        public string InstallerUrl;
        public long Size;
        public string Digest;
    }

    private static Version NormalizeVersion(Version version)
    {
        return new Version(version.Major, version.Minor, Math.Max(0, version.Build), Math.Max(0, version.Revision));
    }

    private static UpdateInfo ParseUpdate(string json, string installedVersion)
    {
        var release = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(json);
        if (release == null) throw new InvalidDataException("Resposta de atualização inválida.");
        object value;
        if ((release.TryGetValue("draft", out value) && true.Equals(value)) ||
            (release.TryGetValue("prerelease", out value) && true.Equals(value))) return null;
        if (!release.TryGetValue("tag_name", out value)) throw new InvalidDataException("A release não tem uma tag de versão.");
        string tag = Convert.ToString(value).Trim();
        Version latest, current;
        if (!Version.TryParse(tag.TrimStart('v', 'V'), out latest) || !Version.TryParse(installedVersion, out current))
            throw new InvalidDataException("A tag da release deve ter o formato v2.3.2.");
        if (NormalizeVersion(latest) <= NormalizeVersion(current)) return null;

        // JavaScriptSerializer returns ArrayList here, not object[]. Accept its enumerable interface.
        IEnumerable assets = release.TryGetValue("assets", out value) ? value as IEnumerable : null;
        if (assets != null) foreach (object asset in assets)
        {
            var item = asset as Dictionary<string, object>;
            if (item == null || !item.TryGetValue("name", out value)) continue;
            string name = Convert.ToString(value);
            if (!String.Equals(name, "SyncroSetup.exe", StringComparison.OrdinalIgnoreCase)) continue;
            if (item.TryGetValue("state", out value) && !String.Equals(Convert.ToString(value), "uploaded", StringComparison.Ordinal)) continue;
            Uri url;
            string downloadUrl = item.TryGetValue("browser_download_url", out value) ? Convert.ToString(value) : "";
            string expectedPath = "/TAKO-77/SyncroApp/releases/download/" + Uri.EscapeDataString(tag) + "/" + Uri.EscapeDataString(name);
            if (!Uri.TryCreate(downloadUrl, UriKind.Absolute, out url) || url.Scheme != Uri.UriSchemeHttps ||
                !String.Equals(url.Host, "github.com", StringComparison.OrdinalIgnoreCase) || !url.IsDefaultPort ||
                url.UserInfo.Length != 0 || url.Query.Length != 0 || url.Fragment.Length != 0 || url.AbsolutePath != expectedPath)
                throw new InvalidDataException("O instalador não pertence à release oficial do Syncro.");
            long size;
            if (!item.TryGetValue("size", out value) || !Int64.TryParse(Convert.ToString(value), out size) || size <= 0)
                throw new InvalidDataException("O tamanho do instalador é inválido.");
            return new UpdateInfo { Version = latest, InstallerUrl = url.AbsoluteUri, Size = size,
                Digest = item.TryGetValue("digest", out value) ? Convert.ToString(value) : "" };
        }
        throw new InvalidDataException("A nova release não contém o ficheiro SyncroSetup.exe pronto a descarregar.");
    }

    private static void ValidateInstaller(string path, long expectedSize, string digest)
    {
        using (var file = File.OpenRead(path))
        {
            if (file.Length != expectedSize || file.Length < 2 || file.ReadByte() != 'M' || file.ReadByte() != 'Z')
                throw new InvalidDataException("O instalador está incompleto ou não é um executável Windows. Volta a tentar.");
            if (!String.IsNullOrEmpty(digest))
            {
                file.Position = 0;
                using (var sha = SHA256.Create())
                {
                    string actual = "sha256:" + BitConverter.ToString(sha.ComputeHash(file)).Replace("-", "").ToLowerInvariant();
                    if (!String.Equals(actual, digest, StringComparison.OrdinalIgnoreCase))
                        throw new InvalidDataException("O instalador não corresponde ao ficheiro publicado no GitHub. Volta a tentar.");
                }
            }
        }
    }

    private async System.Threading.Tasks.Task CheckForUpdates(bool manual = false)
    {
        if (checkingUpdates) { PublishUpdateStatus("Já está em curso uma procura de atualizações.", true); return; }
        checkingUpdates = true;
        bool accepted = false;
        bool launched = false;
        string installerPath = null;
        string status = "";
        try
        {
            PublishUpdateStatus("A procurar atualizações…", true);
            using (var client = new UpdateWebClient())
            {
                client.Headers[HttpRequestHeader.UserAgent] = "Syncro-Updater";
                client.Headers[HttpRequestHeader.Accept] = "application/vnd.github+json";
                string json = await client.DownloadStringTaskAsync(LatestReleaseApi);
                UpdateInfo update = ParseUpdate(json, AppVersion);
                if (IsDisposed || Disposing) return;
                if (update == null) { status = "Tens a versão mais recente (" + AppVersion + ")."; return; }
                if (MessageBox.Show(this, "Está disponível a versão " + update.Version + " do Syncro. Queres descarregar e instalar a atualização agora?", "Atualização do Syncro", MessageBoxButtons.YesNo, MessageBoxIcon.Information) != DialogResult.Yes)
                { status = "Atualização disponível: " + update.Version + ". Podes instalá-la mais tarde."; return; }
                accepted = true;
                PublishUpdateStatus("A descarregar a atualização…", true);
                string downloadFolder = Path.Combine(Path.GetTempPath(), "Syncro-Update-" + Guid.NewGuid().ToString("N"));
                Directory.CreateDirectory(downloadFolder);
                installerPath = Path.Combine(downloadFolder, "SyncroSetup.exe");
                using (var download = new UpdateWebClient(120000))
                {
                    download.Headers[HttpRequestHeader.UserAgent] = "Syncro-Updater";
                    await download.DownloadFileTaskAsync(update.InstallerUrl, installerPath);
                }
                ValidateInstaller(installerPath, update.Size, update.Digest);
                if (IsDisposed || Disposing) return;
                string installFolder = AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
                var installer = Process.Start(new ProcessStartInfo(installerPath) {
                    UseShellExecute = true, Arguments = "/DIR=\"" + installFolder + "\"",
                });
                if (installer == null) throw new IOException("Não foi possível abrir o instalador.");
                launched = true;
                Close();
            }
        }
        catch (Exception ex)
        {
            LogUpdateFailure(ex);
            status = "Não foi possível atualizar. " + ex.Message + " Podes tentar novamente ou descarregar a versão no GitHub.";
            if (accepted && !IsDisposed && !Disposing)
                MessageBox.Show(this, status, "Atualização do Syncro", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            // Startup stays quiet offline. A manual check always reports its outcome in Settings.
            if (!manual && !accepted) status = "Não foi possível procurar atualizações. Verifica a ligação e tenta novamente.";
        }
        finally
        {
            checkingUpdates = false;
            PublishUpdateStatus(status, false);
            if (!launched && installerPath != null)
            {
                try { File.Delete(installerPath); Directory.Delete(Path.GetDirectoryName(installerPath)); }
                catch { /* A failed download must not hide the original error. */ }
            }
        }
    }

    private sealed class UpdateWebClient : WebClient
    {
        private readonly int timeout;
        public UpdateWebClient(int timeout = 15000) { this.timeout = timeout; }
        protected override WebRequest GetWebRequest(Uri address)
        {
            var request = base.GetWebRequest(address);
            request.Timeout = timeout;
            var http = request as HttpWebRequest;
            if (http != null) http.ReadWriteTimeout = timeout;
            return request;
        }
    }
}
