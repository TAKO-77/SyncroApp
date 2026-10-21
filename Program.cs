using System;
using System.IO;
using System.Windows.Forms;
using System.Runtime.InteropServices;
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
    private readonly WebView2 view = new WebView2();

    public PlannerWindow()
    {
        Text = "Planner";
        Width = 1920;
        Height = 1200;
        MinimumSize = new System.Drawing.Size(720, 560);
        StartPosition = FormStartPosition.CenterScreen;
        WindowState = FormWindowState.Maximized;
        Icon = System.Drawing.Icon.ExtractAssociatedIcon(Application.ExecutablePath);
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
        int caption = 0x00171A19; // #191A17 in COLORREF byte order
        DwmSetWindowAttribute(Handle, 35, ref caption, sizeof(int));
        int border = 0x002B2E2D; // #2D2E2B in COLORREF byte order
        DwmSetWindowAttribute(Handle, 34, ref border, sizeof(int));
    }

    [DllImport("dwmapi.dll", PreserveSig = true)]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int valueSize);
    private async System.Threading.Tasks.Task StartPlanner()
    {
        string folder = AppDomain.CurrentDomain.BaseDirectory;
        string html = Path.Combine(folder, "index.html");
        if (!File.Exists(html))
        {
            MessageBox.Show(this, "Não foi encontrado o ficheiro index.html junto da aplicação.", "Planner", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
            return;
        }
        string profile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Planner", "WebView2");
        var environment = await CoreWebView2Environment.CreateAsync(null, profile);
        await view.EnsureCoreWebView2Async(environment);
        view.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
        view.CoreWebView2.Settings.IsStatusBarEnabled = false;
        view.CoreWebView2.Settings.AreDevToolsEnabled = false;
        view.CoreWebView2.SetVirtualHostNameToFolderMapping("planner.local", folder, CoreWebView2HostResourceAccessKind.Allow);
        view.Source = new Uri("https://planner.local/index.html");
    }
}



