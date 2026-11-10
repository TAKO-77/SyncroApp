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
    internal const string AppVersion = "2.10.2";
    private const string LatestReleaseApi = "https://api.github.com/repos/TAKO-77/SyncroApp/releases/latest";
    private readonly WebView2 view = new WebView2();
    private const string NotifyPrefix = "syncro:notify:";
    private const string BackgroundPrefix = "syncro:background:";
    private const string LanguagePrefix = "syncro:language:";
    private ToolStripMenuItem openItem, exitItem;
    private const string ToastAppId = "Syncro.Desktop";
    private readonly List<object> recentToasts = new List<object>();
    private const int WM_QUERYENDSESSION = 0x0011;
    private readonly NotifyIcon tray = new NotifyIcon();
    private bool checkingUpdates;
    private bool exiting;
    private bool balloonOpensTasks;
    // The X only hides the window while this computer receives notifications; the page says which at start-up.
    private bool runInBackground = true;

    // Languages in the order of the translations below; the page reports its choice with syncro:language:<code>.
    private static readonly string[] LanguageCodes = { "pt-PT", "en", "de", "fr" };
    private static int languageIndex;

    private static readonly Dictionary<string, string[]> Texts = new Dictionary<string, string[]> {
        { "tray.open", new[] {
            "Abrir o Syncro",
            "Open Syncro",
            "Syncro öffnen",
            "Ouvrir Syncro" } },
        { "tray.exit", new[] {
            "Sair",
            "Quit",
            "Beenden",
            "Quitter" } },
        { "hint.title", new[] {
            "O Syncro continua aqui",
            "Syncro is still here",
            "Syncro läuft weiter",
            "Syncro est toujours là" } },
        { "hint.body", new[] {
            "Fica junto ao relógio para poder avisar sobre as tarefas. Para o encerrar, escolhe Sair neste ícone.",
            "It stays next to the clock so it can notify you about your tasks. To close it, choose Quit on this icon.",
            "Es bleibt neben der Uhr, damit es dich an Aufgaben erinnern kann. Zum Schließen wähle Beenden an diesem Symbol.",
            "Il reste près de l'horloge pour pouvoir te prévenir de tes tâches. Pour le fermer, choisis Quitter sur cette icône." } },
        { "err.noindex", new[] {
            "Não foi encontrado o index.html junto da aplicação nem na pasta dist.",
            "index.html was not found next to the app or in the dist folder.",
            "index.html wurde weder neben der App noch im Ordner dist gefunden.",
            "index.html est introuvable à côté de l'application et dans le dossier dist." } },
        { "err.browser", new[] {
            "Não foi possível abrir o navegador. Visita as releases do Syncro no GitHub.",
            "Could not open the browser. Visit the Syncro releases on GitHub.",
            "Der Browser konnte nicht geöffnet werden. Besuche die Syncro-Releases auf GitHub.",
            "Impossible d'ouvrir le navigateur. Va voir les versions de Syncro sur GitHub." } },
        { "err.badresponse", new[] {
            "Resposta de atualização inválida.",
            "Invalid update response.",
            "Ungültige Antwort der Update-Suche.",
            "Réponse de mise à jour invalide." } },
        { "err.notag", new[] {
            "A release não tem uma tag de versão.",
            "The release has no version tag.",
            "Das Release hat kein Versions-Tag.",
            "La version publiée n'a pas de tag de version." } },
        { "err.tagformat", new[] {
            "A tag da release deve ter o formato v2.3.2.",
            "The release tag must look like v2.3.2.",
            "Das Release-Tag muss das Format v2.3.2 haben.",
            "Le tag de la version doit avoir le format v2.3.2." } },
        { "err.notofficial", new[] {
            "O instalador não pertence à release oficial do Syncro.",
            "The installer does not belong to the official Syncro release.",
            "Das Installationsprogramm gehört nicht zum offiziellen Syncro-Release.",
            "Le programme d'installation n'appartient pas à la version officielle de Syncro." } },
        { "err.size", new[] {
            "O tamanho do instalador é inválido.",
            "The installer size is invalid.",
            "Die Größe des Installationsprogramms ist ungültig.",
            "La taille du programme d'installation est invalide." } },
        { "err.noasset", new[] {
            "A nova release não contém o ficheiro SyncroSetup.exe pronto a descarregar.",
            "The new release does not contain a SyncroSetup.exe file ready to download.",
            "Das neue Release enthält keine herunterladbare Datei SyncroSetup.exe.",
            "La nouvelle version ne contient pas de fichier SyncroSetup.exe prêt à être téléchargé." } },
        { "err.incomplete", new[] {
            "O instalador está incompleto ou não é um executável Windows. Volta a tentar.",
            "The installer is incomplete or is not a Windows executable. Try again.",
            "Das Installationsprogramm ist unvollständig oder keine Windows-Programmdatei. Versuche es erneut.",
            "Le programme d'installation est incomplet ou n'est pas un exécutable Windows. Réessaie." } },
        { "err.digest", new[] {
            "O instalador não corresponde ao ficheiro publicado no GitHub. Volta a tentar.",
            "The installer does not match the file published on GitHub. Try again.",
            "Das Installationsprogramm stimmt nicht mit der auf GitHub veröffentlichten Datei überein. Versuche es erneut.",
            "Le programme d'installation ne correspond pas au fichier publié sur GitHub. Réessaie." } },
        { "err.openinstaller", new[] {
            "Não foi possível abrir o instalador.",
            "Could not open the installer.",
            "Das Installationsprogramm konnte nicht geöffnet werden.",
            "Impossible d'ouvrir le programme d'installation." } },
        { "upd.busy", new[] {
            "Já está em curso uma procura de atualizações.",
            "An update check is already in progress.",
            "Die Update-Suche läuft bereits.",
            "Une recherche de mises à jour est déjà en cours." } },
        { "upd.checking", new[] {
            "A procurar atualizações…",
            "Checking for updates…",
            "Suche nach Updates …",
            "Recherche de mises à jour…" } },
        { "upd.latest", new[] {
            "Tens a versão mais recente ({0}).",
            "You have the latest version ({0}).",
            "Du hast die neueste Version ({0}).",
            "Tu as la dernière version ({0})." } },
        { "upd.prompt", new[] {
            "Está disponível a versão {0} do Syncro. Queres descarregar e instalar a atualização agora?",
            "Syncro version {0} is available. Do you want to download and install the update now?",
            "Syncro-Version {0} ist verfügbar. Möchtest du das Update jetzt herunterladen und installieren?",
            "La version {0} de Syncro est disponible. Veux-tu télécharger et installer la mise à jour maintenant ?" } },
        { "upd.title", new[] {
            "Atualização do Syncro",
            "Syncro update",
            "Syncro-Update",
            "Mise à jour de Syncro" } },
        { "upd.later", new[] {
            "Atualização disponível: {0}. Podes instalá-la mais tarde.",
            "Update available: {0}. You can install it later.",
            "Update verfügbar: {0}. Du kannst es später installieren.",
            "Mise à jour disponible : {0}. Tu peux l'installer plus tard." } },
        { "upd.downloading", new[] {
            "A descarregar a atualização…",
            "Downloading the update…",
            "Update wird heruntergeladen …",
            "Téléchargement de la mise à jour…" } },
        { "upd.failed", new[] {
            "Não foi possível atualizar. {0} Podes tentar novamente ou descarregar a versão no GitHub.",
            "Could not update. {0} You can try again or download the version from GitHub.",
            "Das Update ist fehlgeschlagen. {0} Du kannst es erneut versuchen oder die Version auf GitHub herunterladen.",
            "Impossible de mettre à jour. {0} Tu peux réessayer ou télécharger la version sur GitHub." } },
        { "upd.checkfailed", new[] {
            "Não foi possível procurar atualizações. Verifica a ligação e tenta novamente.",
            "Could not check for updates. Check your connection and try again.",
            "Die Update-Suche ist fehlgeschlagen. Prüfe deine Verbindung und versuche es erneut.",
            "Impossible de rechercher des mises à jour. Vérifie ta connexion et réessaie." } },
    };

    private static string Tr(string id)
    {
        string[] values;
        if (!Texts.TryGetValue(id, out values)) return id;
        return values[languageIndex];
    }

    private static string Tr(string id, params object[] args)
    {
        return String.Format(Tr(id), args);
    }

    private static string LanguageFile()
    {
        return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Syncro", "language.txt");
    }

    private static void LoadLanguage()
    {
        try
        {
            int index = Array.IndexOf(LanguageCodes, File.ReadAllText(LanguageFile()).Trim());
            if (index >= 0) languageIndex = index;
        }
        catch { /* No saved language yet: Portuguese. */ }
    }

    private void SetLanguage(string code)
    {
        int index = Array.IndexOf(LanguageCodes, code);
        if (index < 0 || index == languageIndex) return;
        languageIndex = index;
        if (openItem != null) openItem.Text = Tr("tray.open");
        if (exitItem != null) exitItem.Text = Tr("tray.exit");
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(LanguageFile()));
            File.WriteAllText(LanguageFile(), code);
        }
        catch { /* Losing the saved language only affects texts shown before the page loads. */ }
    }

    public PlannerWindow(EventWaitHandle showRequest)
    {
        LoadLanguage();
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
        openItem = new ToolStripMenuItem(Tr("tray.open"), null, (sender, args) => ShowFromTray());
        exitItem = new ToolStripMenuItem(Tr("tray.exit"), null, (sender, args) => ExitApp());
        menu.Items.Add(openItem);
        menu.Items.Add(exitItem);
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
        if (!exiting && e.CloseReason == CloseReason.UserClosing && runInBackground)
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
            Notify(Tr("hint.title"), Tr("hint.body"), false);
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
            MessageBox.Show(this, Tr("err.noindex"), "Syncro", MessageBoxButtons.OK, MessageBoxIcon.Error);
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
        view.CoreWebView2.Settings.IsZoomControlEnabled = false;
        view.CoreWebView2.Settings.IsPinchZoomEnabled = false;
        view.ZoomFactor = 1;
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
                if (isReleases) PublishUpdateStatus(Tr("err.browser"), false);
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
            else if (message.StartsWith(BackgroundPrefix, StringComparison.Ordinal)) runInBackground = message.Substring(BackgroundPrefix.Length) != "off";
            else if (message.StartsWith(LanguagePrefix, StringComparison.Ordinal)) SetLanguage(message.Substring(LanguagePrefix.Length));
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
        if (release == null) throw new InvalidDataException(Tr("err.badresponse"));
        object value;
        if ((release.TryGetValue("draft", out value) && true.Equals(value)) ||
            (release.TryGetValue("prerelease", out value) && true.Equals(value))) return null;
        if (!release.TryGetValue("tag_name", out value)) throw new InvalidDataException(Tr("err.notag"));
        string tag = Convert.ToString(value).Trim();
        Version latest, current;
        if (!Version.TryParse(tag.TrimStart('v', 'V'), out latest) || !Version.TryParse(installedVersion, out current))
            throw new InvalidDataException(Tr("err.tagformat"));
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
                throw new InvalidDataException(Tr("err.notofficial"));
            long size;
            if (!item.TryGetValue("size", out value) || !Int64.TryParse(Convert.ToString(value), out size) || size <= 0)
                throw new InvalidDataException(Tr("err.size"));
            return new UpdateInfo { Version = latest, InstallerUrl = url.AbsoluteUri, Size = size,
                Digest = item.TryGetValue("digest", out value) ? Convert.ToString(value) : "" };
        }
        throw new InvalidDataException(Tr("err.noasset"));
    }

    private static void ValidateInstaller(string path, long expectedSize, string digest)
    {
        using (var file = File.OpenRead(path))
        {
            if (file.Length != expectedSize || file.Length < 2 || file.ReadByte() != 'M' || file.ReadByte() != 'Z')
                throw new InvalidDataException(Tr("err.incomplete"));
            if (!String.IsNullOrEmpty(digest))
            {
                file.Position = 0;
                using (var sha = SHA256.Create())
                {
                    string actual = "sha256:" + BitConverter.ToString(sha.ComputeHash(file)).Replace("-", "").ToLowerInvariant();
                    if (!String.Equals(actual, digest, StringComparison.OrdinalIgnoreCase))
                        throw new InvalidDataException(Tr("err.digest"));
                }
            }
        }
    }

    private async System.Threading.Tasks.Task CheckForUpdates(bool manual = false)
    {
        if (checkingUpdates) { PublishUpdateStatus(Tr("upd.busy"), true); return; }
        checkingUpdates = true;
        bool accepted = false;
        bool launched = false;
        string installerPath = null;
        string status = "";
        try
        {
            PublishUpdateStatus(Tr("upd.checking"), true);
            using (var client = new UpdateWebClient())
            {
                client.Headers[HttpRequestHeader.UserAgent] = "Syncro-Updater";
                client.Headers[HttpRequestHeader.Accept] = "application/vnd.github+json";
                string json = await client.DownloadStringTaskAsync(LatestReleaseApi);
                UpdateInfo update = ParseUpdate(json, AppVersion);
                if (IsDisposed || Disposing) return;
                if (update == null) { status = Tr("upd.latest", AppVersion); return; }
                if (MessageBox.Show(this, Tr("upd.prompt", update.Version), Tr("upd.title"), MessageBoxButtons.YesNo, MessageBoxIcon.Information) != DialogResult.Yes)
                { status = Tr("upd.later", update.Version); return; }
                accepted = true;
                PublishUpdateStatus(Tr("upd.downloading"), true);
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
                if (installer == null) throw new IOException(Tr("err.openinstaller"));
                launched = true;
                ExitApp();
            }
        }
        catch (Exception ex)
        {
            LogUpdateFailure(ex);
            status = Tr("upd.failed", ex.Message);
            if (accepted && !IsDisposed && !Disposing)
                MessageBox.Show(this, status, Tr("upd.title"), MessageBoxButtons.OK, MessageBoxIcon.Warning);
            // Startup stays quiet offline. A manual check always reports its outcome in Settings.
            if (!manual && !accepted) status = Tr("upd.checkfailed");
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
