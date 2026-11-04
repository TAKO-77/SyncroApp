using System;
using System.IO;
using System.Windows.Forms;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Net;
using System.Collections.Generic;
using System.Web.Script.Serialization;
using System.Diagnostics;
using System.Collections;
using System.Security.Cryptography;
using System.Reflection;
using System.Security;
using System.Text;
using System.Threading;
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
        // The window can be hidden in the tray, so a second launch shows it instead of notifying twice.
        // Scoped to this copy of the program, so a development build does not open the installed one.
        string instance = InstanceName();
        bool first;
        using (var running = new Mutex(true, instance + "-running", out first))
        using (var showRequest = new EventWaitHandle(false, EventResetMode.AutoReset, instance + "-show"))
        {
            if (!first) { showRequest.Set(); return; }
            Application.Run(new PlannerWindow(showRequest));
        }
    }

    private static string InstanceName()
    {
        using (var sha = SHA256.Create())
        {
            byte[] hash = sha.ComputeHash(Encoding.UTF8.GetBytes(Application.ExecutablePath.ToLowerInvariant()));
            return "Syncro-" + BitConverter.ToString(hash).Replace("-", "");
        }
    }
}

internal sealed class PlannerWindow : Form
{
    internal const string AppVersion = "2.9.0";
    private const string LatestReleaseApi = "https://api.github.com/repos/TAKO-77/SyncroApp/releases/latest";
    private readonly WebView2 view = new WebView2();
    private const string NotifyPrefix = "syncro:notify:";
    private const string ToastAppId = "Syncro.Desktop";
    private readonly List<object> recentToasts = new List<object>();
    private const int WM_QUERYENDSESSION = 0x0011;
    private readonly NotifyIcon tray = new NotifyIcon();
    private bool checkingUpdates;
    private bool exiting;
    private bool balloonOpensTasks;

    public PlannerWindow(EventWaitHandle showRequest)
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
        SetUpTray();
        ThreadPool.RegisterWaitForSingleObject(showRequest, (state, timedOut) =>
        {
            try { if (IsHandleCreated && !IsDisposed) BeginInvoke(new Action(ShowFromTray)); }
            catch (InvalidOperationException) { /* The window closed in the meantime. */ }
        }, null, Timeout.Infinite, false);
    }

    private void SetUpTray()
    {
        var menu = new ContextMenuStrip();
        menu.Items.Add("Abrir o Syncro", null, (sender, args) => ShowFromTray());
        menu.Items.Add("Sair", null, (sender, args) => ExitApp());
        tray.Icon = Icon;
        tray.Text = "Syncro";
        tray.ContextMenuStrip = menu;
        tray.MouseClick += (sender, args) => { if (args.Button == MouseButtons.Left) ShowFromTray(); };
        tray.BalloonTipClicked += (sender, args) => { if (balloonOpensTasks) OpenTasks(); else ShowFromTray(); };
        tray.Visible = true;
    }

    private void ShowFromTray()
    {
        Show();
        if (WindowState == FormWindowState.Minimized) WindowState = FormWindowState.Normal;
        // Windows may refuse to bring a window forward on request; briefly topmost gets past that.
        TopMost = true;
        TopMost = false;
        Activate();
    }

    private void ExitApp()
    {
        exiting = true;
        Close();
    }

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        if (!exiting && e.CloseReason == CloseReason.UserClosing)
        {
            e.Cancel = true;
            Hide();
            ShowTrayHintOnce();
            return;
        }
        base.OnFormClosing(e);
    }

    protected override void OnFormClosed(FormClosedEventArgs e)
    {
        // Without this the icon stays next to the clock until the mouse passes over it.
        tray.Visible = false;
        tray.Dispose();
        base.OnFormClosed(e);
    }

    private void ShowTrayHintOnce()
    {
        try
        {
            string folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Syncro");
            string marker = Path.Combine(folder, "tray-hint-shown");
            if (File.Exists(marker)) return;
            Directory.CreateDirectory(folder);
            File.WriteAllText(marker, "");
            Notify("O Syncro continua aqui", "Fica junto ao relógio para poder avisar sobre as tarefas. Para o encerrar, escolhe Sair neste ícone.", false);
        }
        catch (Exception ex) { LogUpdateFailure(ex); }
    }

    private void ShowNotification(string json)
    {
        string title, body;
        try
        {
            var notice = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(json);
            title = Convert.ToString(notice["title"]);
            body = Convert.ToString(notice["body"]);
        }
        catch (Exception ex) { LogUpdateFailure(ex); return; }
        if (String.IsNullOrWhiteSpace(title) || String.IsNullOrWhiteSpace(body)) return;
        Notify(title, body, true);
    }

    private void Notify(string title, string body, bool opensTasks)
    {
        if (ShowToast(title, body, opensTasks)) return;
        balloonOpensTasks = opensTasks;
        // The shell limits these to 63 and 255 characters.
        tray.ShowBalloonTip(10000, Clip(title, 63), Clip(body, 255), ToolTipIcon.None);
    }

    /// <summary>Shows a Windows toast; current Windows builds silently drop tray balloons. Returns false when it cannot.</summary>
    /// <remarks>Uses reflection because csc.exe here has no references to the Windows Runtime metadata.</remarks>
    private bool ShowToast(string title, string body, bool opensTasks)
    {
        try
        {
            Type manager = Type.GetType("Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime", true);
            Type notifierType = Type.GetType("Windows.UI.Notifications.ToastNotifier, Windows.UI.Notifications, ContentType=WindowsRuntime", true);
            Type toastType = Type.GetType("Windows.UI.Notifications.ToastNotification, Windows.UI.Notifications, ContentType=WindowsRuntime", true);
            Type xmlType = Type.GetType("Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType=WindowsRuntime", true);
            RegisterToastSender();
            object xml = Activator.CreateInstance(xmlType);
            xmlType.GetMethod("LoadXml", new[] { typeof(string) }).Invoke(xml, new object[] {
                // Windows already shows the sender's name above the text, so it is not repeated as a title.
                "<toast><visual><binding template=\"ToastGeneric\">" + (title == "Syncro" ? "" : "<text>" + SecurityElement.Escape(title) + "</text>") + "<text>" + SecurityElement.Escape(body) + "</text></binding></visual></toast>" });
            object toast = Activator.CreateInstance(toastType, xml);
            AddToastClick(toastType, toast, opensTasks ? "OnTaskToastClicked" : "OnHintToastClicked");
            object notifier = manager.GetMethod("CreateToastNotifier", new[] { typeof(string) }).Invoke(null, new object[] { ToastAppId });
            notifierType.GetMethod("Show", new[] { toastType }).Invoke(notifier, new[] { toast });
            // Keeps the click handlers alive while the toast can still be clicked.
            recentToasts.Add(toast);
            if (recentToasts.Count > 20) recentToasts.RemoveAt(0);
            return true;
        }
        catch (Exception ex)
        {
            LogUpdateFailure(ex);
            return false;
        }
    }

    private void AddToastClick(Type toastType, object toast, string handler)
    {
        // A failure here only loses the click, so the toast is still shown.
        try
        {
            EventInfo activated = toastType.GetEvent("Activated");
            MethodInfo method = typeof(PlannerWindow).GetMethod(handler, BindingFlags.Instance | BindingFlags.NonPublic);
            // EventInfo.AddEventHandler refuses Windows Runtime events; this is the route meant for them.
            Type handlerType = activated.EventHandlerType;
            Delegate add = Delegate.CreateDelegate(typeof(Func<,>).MakeGenericType(handlerType, typeof(EventRegistrationToken)), toast, activated.GetAddMethod());
            Delegate remove = Delegate.CreateDelegate(typeof(Action<EventRegistrationToken>), toast, activated.GetRemoveMethod());
            typeof(WindowsRuntimeMarshal).GetMethod("AddEventHandler").MakeGenericMethod(handlerType)
                .Invoke(null, new object[] { add, remove, Delegate.CreateDelegate(handlerType, this, method) });
        }
        catch (Exception ex) { LogUpdateFailure(ex); }
    }

    private void OnTaskToastClicked(object sender, object args) { RunOnWindow(OpenTasks); }
    private void OnHintToastClicked(object sender, object args) { RunOnWindow(ShowFromTray); }

    private void RunOnWindow(Action action)
    {
        try { if (IsHandleCreated && !IsDisposed) BeginInvoke(action); }
        catch (InvalidOperationException) { /* The window closed in the meantime. */ }
    }

    private void OpenTasks()
    {
        ShowFromTray();
        if (view.CoreWebView2 != null)
            view.CoreWebView2.PostWebMessageAsJson(new JavaScriptSerializer().Serialize(new { type = "syncro:open-tasks" }));
    }

    /// <summary>Windows only shows toasts from a registered sender, which also gives them the name and icon.</summary>
    private static void RegisterToastSender()
    {
        using (var key = Microsoft.Win32.Registry.CurrentUser.CreateSubKey(@"Software\Classes\AppUserModelId\" + ToastAppId))
        {
            key.SetValue("DisplayName", "Syncro");
            string icon = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Syncro-brand-amber-transparent.ico");
            if (File.Exists(icon)) key.SetValue("IconUri", icon);
        }
    }

    private static string Clip(string text, int length)
    {
        return text.Length <= length ? text : text.Substring(0, length - 1) + "…";
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
        // Windows shutting down, or the installer asking through Restart Manager: really close.
        if (m.Msg == WM_QUERYENDSESSION) exiting = true;
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
            ExitApp();
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
            else if (message.StartsWith(NotifyPrefix, StringComparison.Ordinal)) ShowNotification(message.Substring(NotifyPrefix.Length));
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
                ExitApp();
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
