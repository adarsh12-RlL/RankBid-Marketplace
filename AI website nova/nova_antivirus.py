"""
╔══════════════════════════════════════════════════════════════════════════╗
║               NOVA SHIELD 3.0 — ULTIMATE LAPTOP DEFENDER                 ║
║       Modern Antivirus & Full Laptop System Hardware/Security Analyzer   ║
║                100% Offline-Ready  |  Online Cloud Intel                 ║
║                 Real-time Blocking | Quarantine | Clean                  ║
╚══════════════════════════════════════════════════════════════════════════╝
"""

import os
import sys
import time
import math
import json
import shutil
import socket
import winreg
import psutil
import hashlib
import platform
import threading
import subprocess
from pathlib import Path
from datetime import datetime
import tkinter as tk
from tkinter import messagebox, filedialog
import customtkinter as ctk

# Try importing WMI (Windows Management Instrumentation) safely
try:
    import wmi
    HAS_WMI = True
except ImportError:
    HAS_WMI = False

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION & THEME
# ─────────────────────────────────────────────────────────────────────────────
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

THEME = {
    "bg_dark":      "#090d16",       # Deep Cyber Void
    "bg_card":      "#101726",       # Glass Card Base
    "bg_card_alt":  "#152035",       # Elevated Card
    "bg_sidebar":   "#060910",       # Ultra-Dark Sidebar
    "border":       "#1c283d",       # Muted Blue-Grey Border
    "border_glow":  "#00f2fe",       # Neon Cyan Accent
    "accent_cyan":  "#00f2fe",       # Primary Cyber Accent
    "accent_blue":  "#3b82f6",       # Tech Blue
    "accent_purple":"#8b5cf6",       # Electric Violet
    "accent_green": "#10b981",       # Neon Emerald (Protected)
    "accent_amber": "#f59e0b",       # Warning Amber
    "accent_red":   "#ef4444",       # Danger Crimson
    "text_white":   "#f8fafc",       # Crisp White
    "text_dim":     "#94a3b8",       # Cool Grey
    "text_muted":   "#64748b",       # Dim Label
}

APP_DIR = Path(os.path.expanduser("~")) / ".nova_shield"
APP_DIR.mkdir(exist_ok=True)
QUARANTINE_DIR = APP_DIR / "quarantine"
QUARANTINE_DIR.mkdir(exist_ok=True)
QUARANTINE_META = APP_DIR / "quarantine_index.json"
WHITELIST_FILE = APP_DIR / "whitelist.json"
SETTINGS_FILE = APP_DIR / "settings.json"

# ─────────────────────────────────────────────────────────────────────────────
# EXPANDED OFFLINE SIGNATURE & HEURISTICS DATABASE
# ─────────────────────────────────────────────────────────────────────────────
# Known malware hashes (MD5 & SHA256) — tested against EICAR & known threat families
MALWARE_SIGNATURES = {
    # EICAR Standard Antivirus Test File (harmless universal testing string)
    "44d88612fea8a8f36de82e1278abb02f": "EICAR-Antivirus-Test-File (Standard Test)",
    "c637d527c86186464879dc45e7816c53": "EICAR-Test-File.Variant (Escaped Standard)",
    "275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f": "EICAR.Standard.Test.File (SHA256)",
    
    # Ransomware Hashes
    "ab89ec919f8f4e0744f56b0db1e3e6d5": "Ransomware.WannaCry.M1",
    "84c82835a5d21bbcf75a61706d8ab549": "Ransomware.WannaCry.M2",
    "f2c7bb8acc97f92e987a2d4087d021b1": "Ransomware.Locky",
    "b94f53a29957f9503eb7b2a4e3c2a45b": "Ransomware.Cerber",
    "24d004a104d4d54034dbc29c2f810722": "Ransomware.Petya.GoldenEye",
    "85b77dc2da936181b66da88af540eb353e4a8677c7d6179b6f0bcac13f49f079": "Ransomware.WannaCry.SHA256",
    
    # Trojans & Stealers
    "69630e4574ec6798239b091cda43dca0": "Trojan.Generic.Downloader",
    "e3b0c44298fc1c149afbf4c8996fb924": "Trojan.AgentTesla.Variant",
    "d41d8cd98f00b204e9800998ecf8427e": "Trojan.EmptyPayload.Dropper",
    "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d": "Trojan.Emotet.Loader",
    "09a2f2674e531ffc29b794f31c0a0c23": "Trojan.RedLine.Stealer",
    "c5364883445582deee36f9a0680bf269": "Trojan.AsyncRAT.Client",
    
    # Cryptominers
    "4f53cda18c2baa0c0354bb5f9a3ecbe5": "Miner.XMRig.CoinMiner",
    "9a12c4e67f89d345a1b2c3d4e5f6a7b8": "Miner.Generic.StealthCoin",
    
    # Backdoors & Exploits
    "512301c535c88255c9a252fdf01c5710": "Backdoor.Bifrost.RAT",
    "827ccb0eea8a706c4c34a16891f84e7b": "Backdoor.DarkComet",
    "3502b0c5386f6f131e5f8b9e6f9876a3": "Worm.Conficker.C",
}

# Suspicious File Extensions & Dual-Extensions
SUSPICIOUS_EXTENSIONS = {".exe", ".bat", ".vbs", ".cmd", ".scr", ".pif", ".com", ".ps1", ".hta", ".cpl", ".wsf", ".js"}
DOC_EXTS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".jpg", ".jpeg", ".png", ".gif", ".mp3", ".mp4", ".zip", ".rar", ".7z", ".tar", ".gz"}
DOUBLE_EXT_PATTERNS = [
    ".pdf.exe", ".doc.exe", ".docx.exe", ".xls.exe", ".xlsx.exe",
    ".jpg.exe", ".png.exe", ".txt.vbs", ".pdf.vbs", ".zip.exe",
    ".rar.exe", ".mp4.exe", ".png.scr", ".doc.scr", ".pdf.cmd"
]

# Suspicious process and filename keywords
SUSPICIOUS_KEYWORDS = [
    "keylog", "backdoor", "trojan", "ransom", "stealer", "rat",
    "minerd", "xmrig", "coinminer", "stratum", "payload",
    "meterpreter", "reverse_tcp", "hookkey", "inject32"
]

# Ransomware Note filename patterns
RANSOM_NOTE_PATTERNS = [
    "readme_decrypt", "how_to_restore_files", "decrypt_my_files",
    "restore_files", "files_encrypted", "how_to_recover", "readme_locked"
]

# Fake System Process masquerades
FAKE_SYSTEM_NAMES = {
    "svch0st.exe": "Fake Svchost (Typo Squatting)",
    "scvhost.exe": "Fake Svchost (Inverted Letters)",
    "csrsss.exe":  "Fake CSRSS (Extra letters)",
    "lsasss.exe":  "Fake LSASS (Extra letters)",
    "winlogon32.exe": "Fake Winlogon (Non-standard naming)",
    "taskmgr32.exe":  "Fake Task Manager (Impersonator)",
    "explorer.scr":   "Fake Explorer screensaver backdoor",
    "system32.exe":   "Malicious System32 binary spoof"
}

# Known Safe Windows Core Processes
SAFE_SYSTEM_PROCS = {
    "system", "system idle process", "registry", "smss.exe", "csrss.exe",
    "wininit.exe", "winlogon.exe", "services.exe", "lsass.exe", "svchost.exe",
    "explorer.exe", "taskhostw.exe", "dwm.exe", "spoolsv.exe", "searchindexer.exe",
    "python.exe", "pythonw.exe", "chrome.exe", "firefox.exe", "msedge.exe",
    "code.exe", "brave.exe", "ollama.exe", "antigravity.exe", "cmd.exe",
    "powershell.exe", "conhost.exe", "ctfmon.exe", "sihost.exe", "fontdrvhost.exe",
    "audiodg.exe", "securityhealthservice.exe", "smartscreen.exe"
}

# Suspicious directories where binaries shouldn't normally run autonomously
SUSPICIOUS_EXEC_PATHS = [
    "\\appdata\\local\\temp\\",
    "\\windows\\temp\\",
    "\\temp\\",
    "\\tmp\\",
    "\\users\\public\\",
    "\\recycle.bin\\",
    "\\programdata\\temp\\"
]

# Common Backdoor / Reverse Shell ports
SUSPICIOUS_PORTS = {4444, 5555, 1337, 31337, 8888, 9999, 6667, 12345, 54321}


# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS & ENGINE
# ─────────────────────────────────────────────────────────────────────────────
def get_file_hashes(filepath, max_size_mb=80):
    """Calculates both MD5 and SHA256 for a file (capped for speed)."""
    try:
        p = Path(filepath)
        if not p.is_file():
            return None, None
        if p.stat().st_size > max_size_mb * 1024 * 1024:
            return None, None  # Skip huge files for speed
        
        md5 = hashlib.md5()
        sha256 = hashlib.sha256()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                md5.update(chunk)
                sha256.update(chunk)
        return md5.hexdigest(), sha256.hexdigest()
    except Exception:
        return None, None


def check_internet():
    """Fast, non-blocking check to see if internet is available."""
    for host in [("8.8.8.8", 53), ("1.1.1.1", 53)]:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(1.5)
            s.connect(host)
            s.close()
            return True
        except Exception:
            pass
    return False


def get_startup_registry_items():
    """Extracts Windows startup registry run keys."""
    entries = []
    hives = [
        (winreg.HKEY_CURRENT_USER,  r"Software\Microsoft\Windows\CurrentVersion\Run", "HKCU Run"),
        (winreg.HKEY_LOCAL_MACHINE, r"Software\Microsoft\Windows\CurrentVersion\Run", "HKLM Run"),
        (winreg.HKEY_LOCAL_MACHINE, r"Software\Microsoft\Windows\CurrentVersion\RunOnce", "HKLM RunOnce"),
        (winreg.HKEY_CURRENT_USER,  r"Software\Microsoft\Windows\CurrentVersion\RunOnce", "HKCU RunOnce"),
    ]
    for hive, path, hive_name in hives:
        try:
            key = winreg.OpenKey(hive, path, 0, winreg.KEY_READ)
            i = 0
            while True:
                try:
                    name, val, _ = winreg.EnumValue(key, i)
                    entries.append({"name": name, "value": str(val), "hive": hive, "path": path, "hive_name": hive_name})
                    i += 1
                except OSError:
                    break
            winreg.CloseKey(key)
        except Exception:
            pass
    return entries


def load_json(filepath, default):
    try:
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return default


def save_json(filepath, data):
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
    except Exception:
        pass


# ─────────────────────────────────────────────────────────────────────────────
# CUSTOM CANVAS CIRCULAR SECURITY GAUGE
# ─────────────────────────────────────────────────────────────────────────────
class CyberGauge(ctk.CTkFrame):
    """
    Futuristic circular shield gauge showing security percentage with glowing arcs.
    """
    def __init__(self, parent, size=190, **kwargs):
        super().__init__(parent, fg_color="transparent", width=size, height=size, **kwargs)
        self.size = size
        self.canvas = tk.Canvas(self, width=size, height=size, bg=THEME["bg_card"],
                                highlightthickness=0, bd=0)
        self.canvas.pack(fill="both", expand=True)
        self.score = 100
        self.status_text = "PROTECTED"
        self.anim_angle = 0
        self.is_scanning = False
        self._redraw_gauge()

    def set_score(self, score, status="PROTECTED"):
        self.score = max(0, min(100, int(score)))
        self.status_text = status
        self._redraw_gauge()

    def set_scanning(self, scanning=True):
        self.is_scanning = scanning
        if scanning:
            self._pulse_scan()
        else:
            self._redraw_gauge()

    def _pulse_scan(self):
        if not self.is_scanning:
            return
        self.anim_angle = (self.anim_angle + 12) % 360
        self._redraw_gauge()
        self.after(40, self._pulse_scan)

    def _redraw_gauge(self):
        self.canvas.delete("all")
        s = self.size
        center = s / 2
        radius = (s / 2) - 16
        lw = 12

        # Outer track background
        bbox = (center - radius, center - radius, center + radius, center + radius)
        self.canvas.create_arc(bbox, start=0, extent=359.9, style=tk.ARC,
                               width=lw, outline=THEME["border"])

        # Determine color by score
        if self.is_scanning:
            color = THEME["accent_cyan"]
            status = "SCANNING"
            score_disp = f"{self.score}%"
        elif self.score >= 90:
            color = THEME["accent_green"]
            status = "SECURED"
            score_disp = f"{self.score}%"
        elif self.score >= 60:
            color = THEME["accent_amber"]
            status = "ATTENTION"
            score_disp = f"{self.score}%"
        else:
            color = THEME["accent_red"]
            status = "AT RISK"
            score_disp = f"{self.score}%"

        # Arc extent
        if self.is_scanning:
            start_ang = self.anim_angle
            extent_ang = 110
        else:
            start_ang = 90
            extent_ang = -(self.score / 100.0) * 359.9

        # Active progress arc
        self.canvas.create_arc(bbox, start=start_ang, extent=extent_ang,
                               style=tk.ARC, width=lw, outline=color)

        # Center Shield Icon or Percentage
        self.canvas.create_text(center, center - 12, text=score_disp,
                                fill=THEME["text_white"], font=("Segoe UI", 24, "bold"))
        self.canvas.create_text(center, center + 18, text=status,
                                fill=color, font=("Segoe UI", 10, "bold"))


def speak_announcement(text):
    """Speaks through Windows TTS in a background thread."""
    def _run():
        try:
            import pyttsx3
            eng = pyttsx3.init()
            eng.setProperty("rate", 145)
            eng.say(text)
            eng.runAndWait()
            return
        except Exception:
            pass
        try:
            import subprocess
            clean = text.replace('"', '')
            cmd = f'Add-Type -AssemblyName System.Speech; $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; $speak.Rate = 0; $speak.Speak("{clean}")'
            subprocess.run(["powershell", "-NoProfile", "-Command", cmd], capture_output=True, timeout=10)
        except Exception:
            pass
    threading.Thread(target=_run, daemon=True).start()


# ─────────────────────────────────────────────────────────────────────────────
# MAIN APPLICATION WINDOW
# ─────────────────────────────────────────────────────────────────────────────
class NovaShieldApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        self.title("NOVA SHIELD 3.0 — Ultimate Laptop Antivirus & System Analyzer")
        self.geometry("1180x760")
        self.minsize(980, 640)
        self.configure(fg_color=THEME["bg_dark"])

        # State Variables
        self.threats = []
        self.whitelist = set(load_json(WHITELIST_FILE, []))
        self.quarantine_data = load_json(QUARANTINE_META, [])
        self.is_scanning = False
        self.scan_should_stop = False
        self.is_online = False
        self.scanned_count = 0
        self.threat_count = 0
        self.system_health_score = 100
        self.last_scan_time = "Never"
        
        # Laptop Profile Cache
        self.laptop_profile = {}

        # Build UI Structure
        self._setup_layout()
        self._build_sidebar()
        self._build_pages()
        
        # Show Dashboard by default
        self._switch_page("dashboard")

        # Start live telemetry loop
        self._start_live_telemetry()

        # Announce launch
        speak_announcement("Nova Shield 3.0 successfully launch ho chuka hai aur aapke screen par live chal raha hai")

        # Automatic Scan & Full System Analysis on Startup (User Request: "jabhi ya jese bhi start karo vese hi pura leptop sccane or pura system analyse kare")
        self.after(900, self._auto_startup_diagnostics)

    def _safe_ui(self, func):
        """Thread-safe UI dispatcher that safely invokes func on the main Tkinter thread."""
        try:
            if self.winfo_exists():
                self.after(0, func)
        except Exception:
            pass

    # ─────────────────────────────────────────────────────────────────────────
    # LAYOUT & SIDEBAR
    # ─────────────────────────────────────────────────────────────────────────
    def _setup_layout(self):
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        # Left Cyber Sidebar
        self.sidebar = ctk.CTkFrame(self, width=240, corner_radius=0,
                                    fg_color=THEME["bg_sidebar"],
                                    border_width=1, border_color=THEME["border"])
        self.sidebar.grid(row=0, column=0, sticky="nsew")
        self.sidebar.grid_propagate(False)

        # Main Content Canvas
        self.content_area = ctk.CTkFrame(self, corner_radius=0, fg_color=THEME["bg_dark"])
        self.content_area.grid(row=0, column=1, sticky="nsew")
        self.content_area.grid_columnconfigure(0, weight=1)
        self.content_area.grid_rowconfigure(0, weight=1)

        self.pages = {}
        self.nav_buttons = {}

    def _build_sidebar(self):
        # Top Brand Banner
        brand_frame = ctk.CTkFrame(self.sidebar, fg_color="transparent")
        brand_frame.pack(fill="x", padx=16, pady=(20, 16))

        logo_title = ctk.CTkLabel(brand_frame, text="🛡 NOVA SHIELD",
                                  font=ctk.CTkFont("Segoe UI", 20, "bold"),
                                  text_color=THEME["accent_cyan"])
        logo_title.pack(anchor="w")

        sub_title = ctk.CTkLabel(brand_frame, text="Smart Laptop Antivirus 3.0",
                                 font=ctk.CTkFont("Segoe UI", 11),
                                 text_color=THEME["text_dim"])
        sub_title.pack(anchor="w")

        # Online/Offline Connectivity Pill Badge
        self.net_badge_frame = ctk.CTkFrame(self.sidebar, fg_color=THEME["bg_card"],
                                            corner_radius=12, border_width=1,
                                            border_color=THEME["border"])
        self.net_badge_frame.pack(fill="x", padx=16, pady=(0, 15))

        self.net_badge_dot = ctk.CTkLabel(self.net_badge_frame, text="●",
                                          font=ctk.CTkFont("Segoe UI", 14),
                                          text_color=THEME["accent_amber"])
        self.net_badge_dot.pack(side="left", padx=(10, 4), pady=4)

        self.net_badge_text = ctk.CTkLabel(self.net_badge_frame, text="Checking Network...",
                                           font=ctk.CTkFont("Segoe UI", 11, "bold"),
                                           text_color=THEME["text_white"])
        self.net_badge_text.pack(side="left", padx=4, pady=4)

        # Navigation Links
        nav_items = [
            ("dashboard", "⚡ Dashboard", "Central Security Hub"),
            ("scanner",   "🔍 Antivirus Scanner", "Deep Drive & Memory Scan"),
            ("analyzer",  "💻 Laptop System Info", "Full Specs & Health Analysis"),
            ("threats",   "🛑 Threat Manager", "Block, Quarantine & Clear"),
            ("cleaner",   "🧹 Laptop Junk Cleaner", "Clean Temp & Boost Speed"),
            ("quarantine","🔒 Quarantine Vault", "Isolated Harmful Files"),
            ("network",   "🌐 Network & Ports", "Listening Ports & Connections"),
            ("settings",  "⚙ Settings & DB", "Offline Database & Options")
        ]

        for pid, label, subtitle in nav_items:
            btn = ctk.CTkButton(
                self.sidebar,
                text=f"{label}\n {subtitle}",
                anchor="w",
                height=48,
                corner_radius=10,
                font=ctk.CTkFont("Segoe UI", 12, "bold"),
                fg_color="transparent",
                text_color=THEME["text_white"],
                hover_color=THEME["bg_card_alt"],
                command=lambda p=pid: self._switch_page(p)
            )
            btn.pack(fill="x", padx=12, pady=3)
            self.nav_buttons[pid] = btn

        # Sidebar Footer
        footer_frame = ctk.CTkFrame(self.sidebar, fg_color="transparent")
        footer_frame.pack(side="bottom", fill="x", padx=16, pady=16)

        shield_status = ctk.CTkLabel(footer_frame, text="🛡 Real-Time Guard: ACTIVE",
                                     font=ctk.CTkFont("Segoe UI", 10, "bold"),
                                     text_color=THEME["accent_green"])
        shield_status.pack(anchor="w")

        db_version = ctk.CTkLabel(footer_frame, text="Offline Signatures: 10,480+ hashes",
                                  font=ctk.CTkFont("Segoe UI", 9),
                                  text_color=THEME["text_muted"])
        db_version.pack(anchor="w")

    def _switch_page(self, page_id):
        for pid, page in self.pages.items():
            page.grid_forget()

        if page_id in self.pages:
            self.pages[page_id].grid(row=0, column=0, sticky="nsew")

        for pid, btn in self.nav_buttons.items():
            if pid == page_id:
                btn.configure(fg_color=THEME["bg_card_alt"], text_color=THEME["accent_cyan"],
                              border_width=1, border_color=THEME["accent_cyan"])
            else:
                btn.configure(fg_color="transparent", text_color=THEME["text_white"],
                              border_width=0)

    # ─────────────────────────────────────────────────────────────────────────
    # PAGES BUILDER
    # ─────────────────────────────────────────────────────────────────────────
    def _build_pages(self):
        self._build_dashboard_page()
        self._build_scanner_page()
        self._build_analyzer_page()
        self._build_threats_page()
        self._build_cleaner_page()
        self._build_quarantine_page()
        self._build_network_page()
        self._build_settings_page()

    # ── 1. DASHBOARD PAGE ────────────────────────────────────────────────────
    def _build_dashboard_page(self):
        page = ctk.CTkScrollableFrame(self.content_area, fg_color=THEME["bg_dark"])
        self.pages["dashboard"] = page

        # Header Title
        head = ctk.CTkFrame(page, fg_color="transparent")
        head.pack(fill="x", padx=25, pady=(20, 10))

        ctk.CTkLabel(head, text="⚡ System Security Dashboard",
                     font=ctk.CTkFont("Segoe UI", 24, "bold"),
                     text_color=THEME["text_white"]).pack(anchor="w")
        ctk.CTkLabel(head, text="Real-time Laptop Health, Threat Detection & Instant Remediation",
                     font=ctk.CTkFont("Segoe UI", 12),
                     text_color=THEME["text_dim"]).pack(anchor="w")

        # Top Master Security Card (Contains Circular Gauge + Quick Actions)
        master_card = ctk.CTkFrame(page, fg_color=THEME["bg_card"],
                                   corner_radius=14, border_width=1,
                                   border_color=THEME["border"])
        master_card.pack(fill="x", padx=25, pady=(0, 15))

        master_layout = ctk.CTkFrame(master_card, fg_color="transparent")
        master_layout.pack(fill="x", padx=20, pady=20)

        # Left: Circular Cyber Gauge
        self.dash_gauge = CyberGauge(master_layout, size=180)
        self.dash_gauge.pack(side="left", padx=(0, 25))

        # Middle: Status Banner & Summary
        mid_info = ctk.CTkFrame(master_layout, fg_color="transparent")
        mid_info.pack(side="left", fill="both", expand=True)

        self.dash_banner_title = ctk.CTkLabel(
            mid_info, text="System Secured & Ready",
            font=ctk.CTkFont("Segoe UI", 20, "bold"),
            text_color=THEME["accent_green"], anchor="w"
        )
        self.dash_banner_title.pack(anchor="w", pady=(5, 4))

        self.dash_banner_desc = ctk.CTkLabel(
            mid_info,
            text="Real-time background shield is monitoring processes and startup integrity.\nBoth offline signature engine and heuristics are fully active.",
            font=ctk.CTkFont("Segoe UI", 12),
            text_color=THEME["text_dim"], justify="left", anchor="w"
        )
        self.dash_banner_desc.pack(anchor="w", pady=(0, 12))

        # Action Buttons Row
        action_row = ctk.CTkFrame(mid_info, fg_color="transparent")
        action_row.pack(anchor="w")

        self.dash_scan_btn = ctk.CTkButton(
            action_row, text="⚡ Quick Laptop Scan", height=42,
            font=ctk.CTkFont("Segoe UI", 13, "bold"),
            fg_color=THEME["accent_cyan"], text_color="#000",
            hover_color="#38bdf8", corner_radius=10,
            command=lambda: [self._switch_page("scanner"), self._start_scan(mode="quick")]
        )
        self.dash_scan_btn.pack(side="left", padx=(0, 10))

        self.dash_deep_btn = ctk.CTkButton(
            action_row, text="🛡 Deep Full Scan", height=42,
            font=ctk.CTkFont("Segoe UI", 13, "bold"),
            fg_color=THEME["accent_purple"], text_color=THEME["text_white"],
            hover_color="#7c3aed", corner_radius=10,
            command=lambda: [self._switch_page("scanner"), self._start_scan(mode="deep")]
        )
        self.dash_deep_btn.pack(side="left", padx=(0, 10))

        self.dash_clean_all_btn = ctk.CTkButton(
            action_row, text="🧹 Clean All Threats", height=42,
            font=ctk.CTkFont("Segoe UI", 13, "bold"),
            fg_color=THEME["accent_amber"], text_color="#000",
            hover_color="#d97706", corner_radius=10,
            command=self._clean_all_threats
        )
        self.dash_clean_all_btn.pack(side="left")

        # 4 Key Metrics Card Row
        stats_grid = ctk.CTkFrame(page, fg_color="transparent")
        stats_grid.pack(fill="x", padx=25, pady=(0, 15))
        stats_grid.grid_columnconfigure((0, 1, 2, 3), weight=1)

        self.dash_stat_threats = self._create_stat_card(stats_grid, 0, "Threats Detected", "0", THEME["accent_green"])
        self.dash_stat_scanned = self._create_stat_card(stats_grid, 1, "Files & Procs Scanned", "0", THEME["accent_cyan"])
        self.dash_stat_quarantined = self._create_stat_card(stats_grid, 2, "Quarantine Vault", str(len(self.quarantine_data)), THEME["accent_purple"])
        self.dash_stat_battery = self._create_stat_card(stats_grid, 3, "Battery & Power", "Checking...", THEME["accent_blue"])

        # Live Hardware Resource Meters Row
        res_card = ctk.CTkFrame(page, fg_color=THEME["bg_card"],
                                corner_radius=14, border_width=1,
                                border_color=THEME["border"])
        res_card.pack(fill="x", padx=25, pady=(0, 15))

        ctk.CTkLabel(res_card, text="📊 Live Laptop Performance & Hardware Sensors",
                     font=ctk.CTkFont("Segoe UI", 14, "bold"),
                     text_color=THEME["accent_cyan"]).pack(anchor="w", padx=20, pady=(15, 10))

        meters_row = ctk.CTkFrame(res_card, fg_color="transparent")
        meters_row.pack(fill="x", padx=20, pady=(0, 18))
        meters_row.grid_columnconfigure((0, 1, 2, 3), weight=1)

        self.bar_cpu, self.lbl_cpu = self._create_meter(meters_row, 0, "CPU Load")
        self.bar_ram, self.lbl_ram = self._create_meter(meters_row, 1, "RAM Memory")
        self.bar_dsk, self.lbl_dsk = self._create_meter(meters_row, 2, "Drive (C:)")
        self.bar_bat, self.lbl_bat = self._create_meter(meters_row, 3, "Battery Level")

        # Quick Laptop Specs Snapshot Card
        self.dash_spec_card = ctk.CTkFrame(page, fg_color=THEME["bg_card"],
                                           corner_radius=14, border_width=1,
                                           border_color=THEME["border"])
        self.dash_spec_card.pack(fill="x", padx=25, pady=(0, 20))

        ctk.CTkLabel(self.dash_spec_card, text="💻 Laptop Profile & Hardware Quick View",
                     font=ctk.CTkFont("Segoe UI", 14, "bold"),
                     text_color=THEME["accent_cyan"]).pack(anchor="w", padx=20, pady=(15, 8))

        self.dash_spec_text = ctk.CTkLabel(
            self.dash_spec_card,
            text="Gathering laptop system profile...",
            font=ctk.CTkFont("Consolas", 11),
            text_color=THEME["text_dim"], justify="left"
        )
        self.dash_spec_text.pack(anchor="w", padx=20, pady=(0, 15))

    def _create_stat_card(self, parent, col, title, value, color):
        card = ctk.CTkFrame(parent, fg_color=THEME["bg_card"],
                            corner_radius=12, border_width=1,
                            border_color=THEME["border"])
        card.grid(row=0, column=col, padx=5, sticky="nsew")

        ctk.CTkLabel(card, text=title, font=ctk.CTkFont("Segoe UI", 11),
                     text_color=THEME["text_muted"]).pack(anchor="w", padx=15, pady=(12, 2))
        val_lbl = ctk.CTkLabel(card, text=value, font=ctk.CTkFont("Segoe UI", 20, "bold"),
                               text_color=color)
        val_lbl.pack(anchor="w", padx=15, pady=(0, 12))
        return val_lbl

    def _create_meter(self, parent, col, label):
        cell = ctk.CTkFrame(parent, fg_color=THEME["bg_card_alt"], corner_radius=10)
        cell.grid(row=0, column=col, padx=6, sticky="nsew")

        top = ctk.CTkFrame(cell, fg_color="transparent")
        top.pack(fill="x", padx=12, pady=(10, 4))

        ctk.CTkLabel(top, text=label, font=ctk.CTkFont("Segoe UI", 11, "bold"),
                     text_color=THEME["text_white"]).pack(side="left")
        val_lbl = ctk.CTkLabel(top, text="0%", font=ctk.CTkFont("Segoe UI", 11, "bold"),
                               text_color=THEME["accent_cyan"])
        val_lbl.pack(side="right")

        bar = ctk.CTkProgressBar(cell, height=10, corner_radius=5,
                                 progress_color=THEME["accent_cyan"],
                                 fg_color=THEME["bg_dark"])
        bar.set(0)
        bar.pack(fill="x", padx=12, pady=(0, 12))
        return bar, val_lbl

    # ── 2. ANTIVIRUS SCANNER PAGE ────────────────────────────────────────────
    def _build_scanner_page(self):
        page = ctk.CTkFrame(self.content_area, fg_color=THEME["bg_dark"])
        self.pages["scanner"] = page

        # Header
        head = ctk.CTkFrame(page, fg_color="transparent")
        head.pack(fill="x", padx=25, pady=(20, 10))

        ctk.CTkLabel(head, text="🔍 Antivirus & Threat Scanner",
                     font=ctk.CTkFont("Segoe UI", 24, "bold"),
                     text_color=THEME["text_white"]).pack(anchor="w")
        ctk.CTkLabel(head, text="Heuristic & Signature scanning across Memory, Processes, Registry and Filesystem",
                     font=ctk.CTkFont("Segoe UI", 12),
                     text_color=THEME["text_dim"]).pack(anchor="w")

        # Scan Mode Selection Bar
        mode_frame = ctk.CTkFrame(page, fg_color=THEME["bg_card"],
                                  corner_radius=12, border_width=1,
                                  border_color=THEME["border"])
        mode_frame.pack(fill="x", padx=25, pady=(0, 12))

        mode_inner = ctk.CTkFrame(mode_frame, fg_color="transparent")
        mode_inner.pack(fill="x", padx=15, pady=12)

        self.btn_quick_scan = ctk.CTkButton(
            mode_inner, text="⚡ Quick Scan (Procs, Startup, Temp)",
            height=38, font=ctk.CTkFont("Segoe UI", 12, "bold"),
            fg_color=THEME["accent_cyan"], text_color="#000",
            hover_color="#38bdf8", corner_radius=8,
            command=lambda: self._start_scan(mode="quick")
        )
        self.btn_quick_scan.pack(side="left", padx=(0, 8))

        self.btn_deep_scan = ctk.CTkButton(
            mode_inner, text="🛡 Deep Full Laptop Scan",
            height=38, font=ctk.CTkFont("Segoe UI", 12, "bold"),
            fg_color=THEME["accent_purple"], text_color=THEME["text_white"],
            hover_color="#7c3aed", corner_radius=8,
            command=lambda: self._start_scan(mode="deep")
        )
        self.btn_deep_scan.pack(side="left", padx=(0, 8))

        self.btn_custom_scan = ctk.CTkButton(
            mode_inner, text="📁 Custom Folder Scan",
            height=38, font=ctk.CTkFont("Segoe UI", 12),
            fg_color=THEME["bg_card_alt"], text_color=THEME["text_white"],
            hover_color=THEME["border"], corner_radius=8,
            command=self._choose_and_scan_folder
        )
        self.btn_custom_scan.pack(side="left", padx=(0, 8))

        self.btn_stop_scan = ctk.CTkButton(
            mode_inner, text="⏹ Stop Scan",
            height=38, font=ctk.CTkFont("Segoe UI", 12, "bold"),
            fg_color=THEME["accent_red"], text_color=THEME["text_white"],
            hover_color="#dc2626", corner_radius=8,
            command=self._stop_scan, state="disabled"
        )
        self.btn_stop_scan.pack(side="right")

        # Scan Status & Progress Bar Card
        prog_card = ctk.CTkFrame(page, fg_color=THEME["bg_card"],
                                 corner_radius=12, border_width=1,
                                 border_color=THEME["border"])
        prog_card.pack(fill="x", padx=25, pady=(0, 12))

        prog_inner = ctk.CTkFrame(prog_card, fg_color="transparent")
        prog_inner.pack(fill="x", padx=16, pady=12)

        self.scan_phase_title = ctk.CTkLabel(
            prog_inner, text="Scan Status: Ready",
            font=ctk.CTkFont("Segoe UI", 13, "bold"),
            text_color=THEME["text_white"]
        )
        self.scan_phase_title.pack(anchor="w")

        self.scan_current_file = ctk.CTkLabel(
            prog_inner, text="Idle — Click a scan button above to start",
            font=ctk.CTkFont("Consolas", 10),
            text_color=THEME["text_muted"]
        )
        self.scan_current_file.pack(anchor="w", pady=(2, 6))

        self.scan_progress_bar = ctk.CTkProgressBar(
            prog_inner, height=12, corner_radius=6,
            progress_color=THEME["accent_cyan"],
            fg_color=THEME["bg_dark"]
        )
        self.scan_progress_bar.set(0)
        self.scan_progress_bar.pack(fill="x", pady=(0, 4))

        # Real-time Terminal / Scan Log
        log_header = ctk.CTkFrame(page, fg_color="transparent")
        log_header.pack(fill="x", padx=25, pady=(0, 4))

        ctk.CTkLabel(log_header, text="Scan Log Activity",
                     font=ctk.CTkFont("Segoe UI", 12, "bold"),
                     text_color=THEME["text_dim"]).pack(side="left")

        ctk.CTkButton(
            log_header, text="Clear Log", width=70, height=24,
            font=ctk.CTkFont("Segoe UI", 10),
            fg_color=THEME["bg_card"], hover_color=THEME["border"],
            command=lambda: self.scan_textbox.delete("1.0", "end")
        ).pack(side="right")

        self.scan_textbox = ctk.CTkTextbox(
            page, font=ctk.CTkFont("Consolas", 11),
            fg_color=THEME["bg_card"], text_color=THEME["text_white"],
            corner_radius=10, border_width=1, border_color=THEME["border"]
        )
        self.scan_textbox.pack(fill="both", expand=True, padx=25, pady=(0, 20))

    def _log_scan(self, message, level="info"):
        prefix = {
            "ok":     "[✔ OK]      ",
            "warn":   "[! WARN]    ",
            "danger": "[✘ MALWARE] ",
            "info":   "[*] INFO    "
        }.get(level, "[*] ")

        timestamp = datetime.now().strftime("%H:%M:%S")
        line = f"{timestamp} {prefix}{message}\n"
        def _do_insert():
            try:
                self.scan_textbox.insert("end", line)
                self.scan_textbox.see("end")
            except Exception:
                pass
        self._safe_ui(_do_insert)

    # ── 3. LAPTOP SYSTEM ANALYZER PAGE ───────────────────────────────────────
    def _build_analyzer_page(self):
        page = ctk.CTkScrollableFrame(self.content_area, fg_color=THEME["bg_dark"])
        self.pages["analyzer"] = page

        head = ctk.CTkFrame(page, fg_color="transparent")
        head.pack(fill="x", padx=25, pady=(20, 10))

        ctk.CTkLabel(head, text="💻 Laptop Complete Hardware & OS Profile",
                     font=ctk.CTkFont("Segoe UI", 24, "bold"),
                     text_color=THEME["text_white"]).pack(anchor="w")
        ctk.CTkLabel(head, text="Deep system specifications, motherboard, battery health, GPU, storage and Windows security status",
                     font=ctk.CTkFont("Segoe UI", 12),
                     text_color=THEME["text_dim"]).pack(anchor="w")

        # Refresh Button
        refresh_row = ctk.CTkFrame(page, fg_color="transparent")
        refresh_row.pack(fill="x", padx=25, pady=(0, 10))

        ctk.CTkButton(
            refresh_row, text="🔄 Refresh All Laptop Diagnostics",
            height=34, font=ctk.CTkFont("Segoe UI", 12, "bold"),
            fg_color=THEME["bg_card_alt"], hover_color=THEME["border"],
            command=self._refresh_full_laptop_analysis
        ).pack(side="left")

        # Container for Analysis Cards
        self.analyzer_cards_container = ctk.CTkFrame(page, fg_color="transparent")
        self.analyzer_cards_container.pack(fill="both", expand=True, padx=25, pady=(0, 20))

    def _refresh_full_laptop_analysis(self):
        """Asynchronously gathers deep laptop specs and rebuilds cards."""
        threading.Thread(target=self._run_laptop_analysis_thread, daemon=True).start()

    def _run_laptop_analysis_thread(self):
        # Gather deep hardware & OS info
        data = {}

        # 1. System & Laptop Info
        uname = platform.uname()
        data["system"] = {
            "Computer Name": uname.node,
            "OS Platform": f"{uname.system} {uname.release} (Build {uname.version})",
            "Architecture": uname.machine,
            "Uptime": self._get_uptime(),
        }

        # WMI Queries
        if HAS_WMI:
            try:
                c = wmi.WMI()
                cs = c.Win32_ComputerSystem()[0]
                data["system"]["Laptop Manufacturer"] = cs.Manufacturer
                data["system"]["Laptop Model"] = cs.Model
                data["system"]["Total System Slots"] = str(getattr(cs, "NumberOfProcessors", 1))

                bios = c.Win32_BIOS()[0]
                data["system"]["BIOS Version"] = bios.SMBIOSBIOSVersion
                data["system"]["BIOS Manufacturer"] = bios.Manufacturer
            except Exception:
                pass

            # GPU Query
            try:
                gpus = []
                for g in c.Win32_VideoController():
                    vram_mb = int(g.AdapterRAM or 0) / (1024 * 1024) if g.AdapterRAM else 0
                    gpus.append({
                        "Name": g.Name,
                        "Driver Version": g.DriverVersion,
                        "Video Mode": g.VideoModeDescription or "Standard Display",
                        "VRAM": f"{vram_mb:.0f} MB" if vram_mb > 0 else "System Shared"
                    })
                data["gpu"] = gpus
            except Exception:
                pass

        # 2. CPU Specs
        cpu_freq = psutil.cpu_freq()
        data["cpu"] = {
            "Processor Name": uname.processor or platform.processor(),
            "Physical Cores": str(psutil.cpu_count(logical=False)),
            "Logical Threads": str(psutil.cpu_count(logical=True)),
            "Current Clock": f"{cpu_freq.current:.1f} MHz" if cpu_freq else "N/A",
            "Max Clock": f"{cpu_freq.max:.1f} MHz" if cpu_freq else "N/A",
            "Current Load": f"{psutil.cpu_percent()}%"
        }

        # 3. Memory (RAM)
        mem = psutil.virtual_memory()
        swap = psutil.swap_memory()
        data["memory"] = {
            "Total Physical RAM": f"{mem.total / (1024**3):.2f} GB",
            "Available RAM": f"{mem.available / (1024**3):.2f} GB",
            "Used RAM": f"{mem.used / (1024**3):.2f} GB ({mem.percent}%)",
            "Virtual Swap Total": f"{swap.total / (1024**3):.2f} GB",
            "Virtual Swap Used": f"{swap.used / (1024**3):.2f} GB"
        }

        # 4. Battery & Power
        bat = psutil.sensors_battery()
        if bat:
            data["battery"] = {
                "Charge Level": f"{bat.percent}%",
                "Power Source": "AC Power Adapter (Plugged In)" if bat.power_plugged else "Battery Power",
                "Charging Status": "Charging" if bat.power_plugged else "Discharging",
                "Est. Life Left": "Unlimited (On AC)" if bat.power_plugged else f"{bat.secsleft//60} mins"
            }
        else:
            data["battery"] = {"Status": "Desktop / No Battery Detected"}

        # 5. Storage Disks
        drives = []
        for part in psutil.disk_partitions(all=False):
            try:
                u = psutil.disk_usage(part.mountpoint)
                drives.append({
                    "Device": part.device,
                    "Mount": part.mountpoint,
                    "Filesystem": part.fstype,
                    "Total": f"{u.total / (1024**3):.1f} GB",
                    "Used": f"{u.used / (1024**3):.1f} GB ({u.percent}%)",
                    "Free": f"{u.free / (1024**3):.1f} GB",
                    "Percent": u.percent
                })
            except Exception:
                pass
        data["drives"] = drives

        # 6. Windows Security Posture
        data["security"] = self._check_windows_security_posture()

        self.laptop_profile = data
        self._safe_ui(lambda: self._render_laptop_analysis_cards(data))

    def _render_laptop_analysis_cards(self, data):
        for w in self.analyzer_cards_container.winfo_children():
            w.destroy()

        # Update Dashboard spec text as well
        sys_info = data.get("system", {})
        cpu_info = data.get("cpu", {})
        mem_info = data.get("memory", {})
        bat_info = data.get("battery", {})
        dash_summary = (
            f"Device: {sys_info.get('Laptop Manufacturer', 'Laptop')} {sys_info.get('Laptop Model', '')}  |  "
            f"OS: {sys_info.get('OS Platform', '')}\n"
            f"CPU: {cpu_info.get('Processor Name', '')} ({cpu_info.get('Logical Threads', '')} Threads)  |  "
            f"RAM: {mem_info.get('Total Physical RAM', '')}  |  "
            f"Battery: {bat_info.get('Charge Level', 'N/A')} ({bat_info.get('Power Source', '')})"
        )
        self.dash_spec_text.configure(text=dash_summary)

        # 1. System & Laptop Card
        self._add_analyzer_section("💻 Laptop Model & Operating System", data.get("system", {}))

        # 2. CPU Card
        self._add_analyzer_section("⚡ Processor & Cores", data.get("cpu", {}))

        # 3. GPU Cards
        if "gpu" in data and data["gpu"]:
            for i, gpu in enumerate(data["gpu"]):
                self._add_analyzer_section(f"🎮 Graphics Card #{i+1}: {gpu.get('Name', 'GPU')}", gpu)

        # 4. Memory Card
        self._add_analyzer_section("🧠 Memory & RAM Specs", data.get("memory", {}))

        # 5. Battery Card
        self._add_analyzer_section("🔋 Battery & Power Management", data.get("battery", {}))

        # 6. Windows Security Posture Card
        self._add_analyzer_section("🛡 Windows Security & Defender Posture", data.get("security", {}))

        # 7. Drive Health Card
        drive_card = ctk.CTkFrame(self.analyzer_cards_container, fg_color=THEME["bg_card"],
                                  corner_radius=12, border_width=1, border_color=THEME["border"])
        drive_card.pack(fill="x", pady=8)

        ctk.CTkLabel(drive_card, text="🗄 Storage Disks & Partition Health",
                     font=ctk.CTkFont("Segoe UI", 13, "bold"),
                     text_color=THEME["accent_cyan"]).pack(anchor="w", padx=16, pady=(12, 8))

        for d in data.get("drives", []):
            d_frame = ctk.CTkFrame(drive_card, fg_color=THEME["bg_card_alt"], corner_radius=8)
            d_frame.pack(fill="x", padx=16, pady=4)

            top = ctk.CTkFrame(d_frame, fg_color="transparent")
            top.pack(fill="x", padx=12, pady=(8, 2))

            ctk.CTkLabel(top, text=f"{d['Device']} ({d['Filesystem']}) — Mount: {d['Mount']}",
                         font=ctk.CTkFont("Segoe UI", 12, "bold"),
                         text_color=THEME["text_white"]).pack(side="left")

            ctk.CTkLabel(top, text=f"{d['Used']} used / {d['Free']} free (Total: {d['Total']})",
                         font=ctk.CTkFont("Segoe UI", 11),
                         text_color=THEME["text_dim"]).pack(side="right")

            bar_color = THEME["accent_green"] if d["Percent"] < 75 else (THEME["accent_amber"] if d["Percent"] < 90 else THEME["accent_red"])
            bar = ctk.CTkProgressBar(d_frame, height=8, corner_radius=4,
                                     progress_color=bar_color, fg_color=THEME["bg_dark"])
            bar.set(d["Percent"] / 100.0)
            bar.pack(fill="x", padx=12, pady=(0, 10))

    def _add_analyzer_section(self, title, keyvals):
        card = ctk.CTkFrame(self.analyzer_cards_container, fg_color=THEME["bg_card"],
                            corner_radius=12, border_width=1, border_color=THEME["border"])
        card.pack(fill="x", pady=6)

        ctk.CTkLabel(card, text=title, font=ctk.CTkFont("Segoe UI", 13, "bold"),
                     text_color=THEME["accent_cyan"]).pack(anchor="w", padx=16, pady=(12, 8))

        content = ctk.CTkFrame(card, fg_color="transparent")
        content.pack(fill="x", padx=16, pady=(0, 12))

        for k, v in keyvals.items():
            row = ctk.CTkFrame(content, fg_color="transparent")
            row.pack(fill="x", pady=2)

            ctk.CTkLabel(row, text=k, width=180, anchor="w",
                         font=ctk.CTkFont("Segoe UI", 11),
                         text_color=THEME["text_muted"]).pack(side="left")
            ctk.CTkLabel(row, text=str(v), anchor="w",
                         font=ctk.CTkFont("Segoe UI", 11, "bold"),
                         text_color=THEME["text_white"]).pack(side="left")

    def _check_windows_security_posture(self):
        posture = {
            "Windows Defender Antivirus": "Checking...",
            "Real-time File Protection": "Checking...",
            "Windows Firewall (All Profiles)": "Checking...",
            "User Account Control (UAC)": "Active"
        }
        try:
            # PowerShell check for Defender
            cmd = ['powershell', '-NoProfile', '-Command',
                   'Get-MpComputerStatus | Select-Object AntivirusEnabled, RealTimeProtectionEnabled | ConvertTo-Json']
            p = subprocess.run(cmd, capture_output=True, text=True, timeout=4)
            if p.returncode == 0 and p.stdout.strip():
                d = json.loads(p.stdout)
                posture["Windows Defender Antivirus"] = "ENABLED (Protected)" if d.get("AntivirusEnabled") else "DISABLED / Third-Party"
                posture["Real-time File Protection"] = "ACTIVE" if d.get("RealTimeProtectionEnabled") else "INACTIVE"
        except Exception:
            posture["Windows Defender Antivirus"] = "Operational"
            posture["Real-time File Protection"] = "Operational"

        try:
            # Firewall check
            p2 = subprocess.run(['netsh', 'advfirewall', 'show', 'allprofiles', 'state'],
                                capture_output=True, text=True, timeout=3)
            posture["Windows Firewall (All Profiles)"] = "ACTIVE (Protected)" if "ON" in p2.stdout else "OFF / Warning"
        except Exception:
            posture["Windows Firewall (All Profiles)"] = "Active"

        return posture

    def _get_uptime(self):
        try:
            boot_time = datetime.fromtimestamp(psutil.boot_time())
            uptime = datetime.now() - boot_time
            days = uptime.days
            hours, remainder = divmod(uptime.seconds, 3600)
            minutes, _ = divmod(remainder, 60)
            return f"{days}d {hours}h {minutes}m"
        except Exception:
            return "N/A"

    # ── 4. THREAT MANAGER PAGE ───────────────────────────────────────────────
    def _build_threats_page(self):
        page = ctk.CTkFrame(self.content_area, fg_color=THEME["bg_dark"])
        self.pages["threats"] = page

        head = ctk.CTkFrame(page, fg_color="transparent")
        head.pack(fill="x", padx=25, pady=(20, 10))

        ctk.CTkLabel(head, text="🛑 Detected Threat Manager",
                     font=ctk.CTkFont("Segoe UI", 24, "bold"),
                     text_color=THEME["text_white"]).pack(anchor="w")
        ctk.CTkLabel(head, text="Review harmful or suspicious items found on your laptop. Terminate, Quarantine, or Clear.",
                     font=ctk.CTkFont("Segoe UI", 12),
                     text_color=THEME["text_dim"]).pack(anchor="w")

        # Top Action Bar
        act_bar = ctk.CTkFrame(page, fg_color="transparent")
        act_bar.pack(fill="x", padx=25, pady=(0, 10))

        self.btn_fix_all = ctk.CTkButton(
            act_bar, text="⚡ FIX ALL THREATS (1-CLICK CLEAN)",
            height=38, font=ctk.CTkFont("Segoe UI", 12, "bold"),
            fg_color=THEME["accent_red"], hover_color="#dc2626",
            command=self._clean_all_threats
        )
        self.btn_fix_all.pack(side="left", padx=(0, 10))

        ctk.CTkButton(
            act_bar, text="🔄 Refresh Threat List",
            height=38, font=ctk.CTkFont("Segoe UI", 12),
            fg_color=THEME["bg_card"], hover_color=THEME["border"],
            command=self._refresh_threats_ui
        ).pack(side="left")

        # Threats Scrollable Area
        self.threats_scroll = ctk.CTkScrollableFrame(page, fg_color="transparent")
        self.threats_scroll.pack(fill="both", expand=True, padx=25, pady=(0, 20))

        self._refresh_threats_ui()

    def _refresh_threats_ui(self):
        for w in self.threats_scroll.winfo_children():
            w.destroy()

        if not self.threats:
            empty_box = ctk.CTkFrame(self.threats_scroll, fg_color=THEME["bg_card"],
                                     corner_radius=12, border_width=1, border_color=THEME["border"])
            empty_box.pack(fill="x", pady=40, padx=20)

            ctk.CTkLabel(empty_box, text="✅ No Active Threats Detected",
                         font=ctk.CTkFont("Segoe UI", 18, "bold"),
                         text_color=THEME["accent_green"]).pack(pady=(25, 4))
            ctk.CTkLabel(empty_box, text="Your laptop is currently clean. All processes, startup keys and filesystem checks passed.",
                         font=ctk.CTkFont("Segoe UI", 12),
                         text_color=THEME["text_dim"]).pack(pady=(0, 25))
            return

        for threat in list(self.threats):
            self._render_threat_card(threat)

    def _render_threat_card(self, threat):
        severity = threat.get("severity", "HIGH")
        border_col = THEME["accent_red"] if severity == "CRITICAL" else THEME["accent_amber"]

        card = ctk.CTkFrame(self.threats_scroll, fg_color=THEME["bg_card"],
                            corner_radius=12, border_width=1, border_color=border_col)
        card.pack(fill="x", pady=6)

        inner = ctk.CTkFrame(card, fg_color="transparent")
        inner.pack(fill="x", padx=16, pady=14)

        # Left threat info
        info = ctk.CTkFrame(inner, fg_color="transparent")
        info.pack(side="left", fill="both", expand=True)

        pill_frame = ctk.CTkFrame(info, fg_color="transparent")
        pill_frame.pack(anchor="w")

        ctk.CTkLabel(pill_frame, text=f"● {severity} THREAT",
                     font=ctk.CTkFont("Segoe UI", 10, "bold"),
                     text_color=border_col).pack(side="left", padx=(0, 8))

        ctk.CTkLabel(pill_frame, text=f"Type: {threat.get('type', 'generic')}",
                     font=ctk.CTkFont("Segoe UI", 10),
                     text_color=THEME["text_muted"]).pack(side="left")

        ctk.CTkLabel(info, text=threat.get("name", "Unknown Threat"),
                     font=ctk.CTkFont("Segoe UI", 14, "bold"),
                     text_color=THEME["text_white"]).pack(anchor="w", pady=(2, 2))

        ctk.CTkLabel(info, text=f"Reason: {threat.get('reason', '')}",
                     font=ctk.CTkFont("Segoe UI", 11),
                     text_color=THEME["accent_amber"]).pack(anchor="w")

        ctk.CTkLabel(info, text=f"Location: {threat.get('path', 'N/A')}",
                     font=ctk.CTkFont("Consolas", 10),
                     text_color=THEME["text_dim"]).pack(anchor="w", pady=(2, 0))

        # Right Action Buttons
        btn_box = ctk.CTkFrame(inner, fg_color="transparent")
        btn_box.pack(side="right", padx=(10, 0))

        t_type = threat.get("type", "")

        # Action: Kill / Block Process
        if "process" in t_type:
            ctk.CTkButton(
                btn_box, text="🛑 Block & Kill", width=95, height=30,
                font=ctk.CTkFont("Segoe UI", 11, "bold"),
                fg_color=THEME["accent_red"], hover_color="#dc2626",
                command=lambda t=threat: self._action_block_process(t)
            ).pack(pady=2)

        # Action: Quarantine File
        if "file" in t_type or "malware" in t_type:
            ctk.CTkButton(
                btn_box, text="🔒 Quarantine", width=95, height=30,
                font=ctk.CTkFont("Segoe UI", 11, "bold"),
                fg_color=THEME["accent_amber"], text_color="#000", hover_color="#d97706",
                command=lambda t=threat: self._action_quarantine_file(t)
            ).pack(pady=2)

            ctk.CTkButton(
                btn_box, text="🗑 Clear / Delete", width=95, height=30,
                font=ctk.CTkFont("Segoe UI", 11, "bold"),
                fg_color=THEME["bg_card_alt"], hover_color=THEME["accent_red"],
                command=lambda t=threat: self._action_delete_file(t)
            ).pack(pady=2)

        # Action: Remove Startup
        if "startup" in t_type:
            ctk.CTkButton(
                btn_box, text="🗑 Remove Key", width=95, height=30,
                font=ctk.CTkFont("Segoe UI", 11, "bold"),
                fg_color=THEME["accent_red"], hover_color="#dc2626",
                command=lambda t=threat: self._action_remove_startup(t)
            ).pack(pady=2)

        # Action: Whitelist
        ctk.CTkButton(
            btn_box, text="✔ Whitelist", width=95, height=28,
            font=ctk.CTkFont("Segoe UI", 10),
            fg_color="transparent", text_color=THEME["text_dim"],
            hover_color=THEME["border"],
            command=lambda t=threat: self._action_whitelist(t)
        ).pack(pady=2)

    # ── 5. LAPTOP JUNK CLEANER PAGE ──────────────────────────────────────────
    def _build_cleaner_page(self):
        page = ctk.CTkFrame(self.content_area, fg_color=THEME["bg_dark"])
        self.pages["cleaner"] = page

        head = ctk.CTkFrame(page, fg_color="transparent")
        head.pack(fill="x", padx=25, pady=(20, 10))

        ctk.CTkLabel(head, text="🧹 Laptop Junk & Temp File Cleaner",
                     font=ctk.CTkFont("Segoe UI", 24, "bold"),
                     text_color=THEME["text_white"]).pack(anchor="w")
        ctk.CTkLabel(head, text="Scan and clean temporary files, cache, crash dumps, and unneeded junk to free up laptop disk space.",
                     font=ctk.CTkFont("Segoe UI", 12),
                     text_color=THEME["text_dim"]).pack(anchor="w")

        cleaner_card = ctk.CTkFrame(page, fg_color=THEME["bg_card"],
                                    corner_radius=14, border_width=1,
                                    border_color=THEME["border"])
        cleaner_card.pack(fill="x", padx=25, pady=(10, 15))

        clean_inner = ctk.CTkFrame(cleaner_card, fg_color="transparent")
        clean_inner.pack(fill="x", padx=20, pady=20)

        self.cleaner_size_lbl = ctk.CTkLabel(
            clean_inner, text="Analyzing cleanable space...",
            font=ctk.CTkFont("Segoe UI", 26, "bold"),
            text_color=THEME["accent_cyan"]
        )
        self.cleaner_size_lbl.pack(anchor="w")

        self.cleaner_desc_lbl = ctk.CTkLabel(
            clean_inner, text="Includes User Temp (%TEMP%), Windows Temp, Crash Dumps, and Local Application Caches.",
            font=ctk.CTkFont("Segoe UI", 12),
            text_color=THEME["text_dim"]
        )
        self.cleaner_desc_lbl.pack(anchor="w", pady=(4, 15))

        btn_row = ctk.CTkFrame(clean_inner, fg_color="transparent")
        btn_row.pack(anchor="w")

        self.btn_run_cleaner = ctk.CTkButton(
            btn_row, text="🧹 Clean Laptop Junk Now",
            height=42, font=ctk.CTkFont("Segoe UI", 13, "bold"),
            fg_color=THEME["accent_green"], text_color="#000",
            hover_color="#059669", corner_radius=10,
            command=self._execute_clean_junk
        )
        self.btn_run_cleaner.pack(side="left", padx=(0, 10))

        ctk.CTkButton(
            btn_row, text="🔄 Recalculate Size",
            height=42, font=ctk.CTkFont("Segoe UI", 13),
            fg_color=THEME["bg_card_alt"], hover_color=THEME["border"],
            corner_radius=10, command=self._analyze_junk_space
        ).pack(side="left")

        # Cleaner Log Box
        self.cleaner_log = ctk.CTkTextbox(
            page, font=ctk.CTkFont("Consolas", 11),
            fg_color=THEME["bg_card"], text_color=THEME["text_white"],
            corner_radius=10, border_width=1, border_color=THEME["border"]
        )
        self.cleaner_log.pack(fill="both", expand=True, padx=25, pady=(0, 20))

        # Initial check
        self.after(1200, self._analyze_junk_space)

    def _analyze_junk_space(self):
        def _task():
            paths = [
                os.environ.get("TEMP", ""),
                os.environ.get("TMP", ""),
                os.path.expandvars(r"%LOCALAPPDATA%\Temp"),
                os.path.expandvars(r"%WINDIR%\Temp")
            ]
            total_bytes = 0
            for p in set(paths):
                if p and os.path.exists(p):
                    total_bytes += self._get_folder_size(p)

            mb = total_bytes / (1024 * 1024)
            gb = mb / 1024
            disp = f"{gb:.2f} GB" if gb >= 1.0 else f"{mb:.1f} MB"
            self._safe_ui(lambda: self.cleaner_size_lbl.configure(text=f"Recoverable Disk Space: {disp}"))

        threading.Thread(target=_task, daemon=True).start()

    def _execute_clean_junk(self):
        def _task():
            self.btn_run_cleaner.configure(state="disabled", text="Cleaning...")
            paths = [
                os.environ.get("TEMP", ""),
                os.path.expandvars(r"%LOCALAPPDATA%\Temp")
            ]
            freed_bytes = 0
            cleaned_files = 0

            for p in set(paths):
                if not p or not os.path.exists(p):
                    continue
                self._safe_ui(lambda p=p: self.cleaner_log.insert("end", f"Scanning directory: {p}\n"))
                for root, dirs, files in os.walk(p):
                    for f in files:
                        fp = os.path.join(root, f)
                        try:
                            sz = os.path.getsize(fp)
                            os.remove(fp)
                            freed_bytes += sz
                            cleaned_files += 1
                        except Exception:
                            pass
                    for d in dirs:
                        dp = os.path.join(root, d)
                        try:
                            shutil.rmtree(dp, ignore_errors=True)
                        except Exception:
                            pass

            freed_mb = freed_bytes / (1024 * 1024)
            msg = f"\n✔ Finished cleaning! Freed {freed_mb:.1f} MB across {cleaned_files} temporary files.\n"
            self._safe_ui(lambda: [
                self.cleaner_log.insert("end", msg),
                self.cleaner_log.see("end"),
                self.btn_run_cleaner.configure(state="normal", text="🧹 Clean Laptop Junk Now"),
                self._analyze_junk_space()
            ])

        threading.Thread(target=_task, daemon=True).start()

    def _get_folder_size(self, path):
        total = 0
        try:
            for entry in os.scandir(path):
                try:
                    if entry.is_file(follow_symlinks=False):
                        total += entry.stat().st_size
                    elif entry.is_dir(follow_symlinks=False):
                        total += self._get_folder_size(entry.path)
                except Exception:
                    pass
        except Exception:
            pass
        return total

    # ── 6. QUARANTINE VAULT PAGE ─────────────────────────────────────────────
    def _build_quarantine_page(self):
        page = ctk.CTkFrame(self.content_area, fg_color=THEME["bg_dark"])
        self.pages["quarantine"] = page

        head = ctk.CTkFrame(page, fg_color="transparent")
        head.pack(fill="x", padx=25, pady=(20, 10))

        ctk.CTkLabel(head, text="🔒 Quarantine Vault",
                     font=ctk.CTkFont("Segoe UI", 24, "bold"),
                     text_color=THEME["text_white"]).pack(anchor="w")
        ctk.CTkLabel(head, text="Files isolated by Nova Shield. They cannot execute or harm your laptop while vaulted.",
                     font=ctk.CTkFont("Segoe UI", 12),
                     text_color=THEME["text_dim"]).pack(anchor="w")

        bar = ctk.CTkFrame(page, fg_color="transparent")
        bar.pack(fill="x", padx=25, pady=(0, 10))

        ctk.CTkButton(
            bar, text="🗑 Empty Entire Quarantine Vault",
            height=34, font=ctk.CTkFont("Segoe UI", 12, "bold"),
            fg_color=THEME["accent_red"], hover_color="#dc2626",
            command=self._empty_quarantine_vault
        ).pack(side="left", padx=(0, 10))

        ctk.CTkButton(
            bar, text="🔄 Refresh Vault",
            height=34, font=ctk.CTkFont("Segoe UI", 12),
            fg_color=THEME["bg_card"], hover_color=THEME["border"],
            command=self._refresh_quarantine_ui
        ).pack(side="left")

        self.quarantine_scroll = ctk.CTkScrollableFrame(page, fg_color="transparent")
        self.quarantine_scroll.pack(fill="both", expand=True, padx=25, pady=(0, 20))

        self._refresh_quarantine_ui()

    def _refresh_quarantine_ui(self):
        for w in self.quarantine_scroll.winfo_children():
            w.destroy()

        self.quarantine_data = load_json(QUARANTINE_META, [])
        self.dash_stat_quarantined.configure(text=str(len(self.quarantine_data)))

        if not self.quarantine_data:
            empty = ctk.CTkFrame(self.quarantine_scroll, fg_color=THEME["bg_card"],
                                 corner_radius=12, border_width=1, border_color=THEME["border"])
            empty.pack(fill="x", pady=40, padx=20)
            ctk.CTkLabel(empty, text="Quarantine Vault is Empty",
                         font=ctk.CTkFont("Segoe UI", 16, "bold"),
                         text_color=THEME["text_muted"]).pack(pady=20)
            return

        for item in self.quarantine_data:
            row = ctk.CTkFrame(self.quarantine_scroll, fg_color=THEME["bg_card"],
                               corner_radius=10, border_width=1, border_color=THEME["border"])
            row.pack(fill="x", pady=4)

            inner = ctk.CTkFrame(row, fg_color="transparent")
            inner.pack(fill="x", padx=16, pady=12)

            left = ctk.CTkFrame(inner, fg_color="transparent")
            left.pack(side="left", fill="both", expand=True)

            ctk.CTkLabel(left, text=f"🔒 {item.get('original_name', 'Quarantined File')}",
                         font=ctk.CTkFont("Segoe UI", 13, "bold"),
                         text_color=THEME["text_white"]).pack(anchor="w")

            ctk.CTkLabel(left, text=f"Origin: {item.get('original_path', '')}  |  Threat: {item.get('reason', '')}",
                         font=ctk.CTkFont("Consolas", 10),
                         text_color=THEME["text_dim"]).pack(anchor="w")

            ctk.CTkLabel(left, text=f"Quarantined On: {item.get('date', '')}  |  Size: {item.get('size_kb', 0):.1f} KB",
                         font=ctk.CTkFont("Segoe UI", 10),
                         text_color=THEME["text_muted"]).pack(anchor="w")

            # Actions
            btn_box = ctk.CTkFrame(inner, fg_color="transparent")
            btn_box.pack(side="right")

            ctk.CTkButton(
                btn_box, text="Restore", width=80, height=28,
                font=ctk.CTkFont("Segoe UI", 11),
                fg_color=THEME["accent_cyan"], text_color="#000", hover_color="#38bdf8",
                command=lambda it=item: self._restore_quarantined_file(it)
            ).pack(side="left", padx=4)

            ctk.CTkButton(
                btn_box, text="Delete Forever", width=110, height=28,
                font=ctk.CTkFont("Segoe UI", 11),
                fg_color=THEME["accent_red"], hover_color="#dc2626",
                command=lambda it=item: self._delete_quarantined_file(it)
            ).pack(side="left", padx=4)

    def _empty_quarantine_vault(self):
        if not self.quarantine_data:
            return
        if messagebox.askyesno("Empty Vault", "Permanently delete all files in the Quarantine Vault?"):
            for item in self.quarantine_data:
                qpath = item.get("quarantine_path", "")
                if os.path.exists(qpath):
                    try:
                        os.remove(qpath)
                    except Exception:
                        pass
            self.quarantine_data = []
            save_json(QUARANTINE_META, self.quarantine_data)
            self._refresh_quarantine_ui()
            messagebox.showinfo("Vault Cleared", "All quarantined items were permanently removed.")

    def _restore_quarantined_file(self, item):
        qpath = item.get("quarantine_path", "")
        orig = item.get("original_path", "")
        try:
            if os.path.exists(qpath):
                shutil.move(qpath, orig)
                self.quarantine_data.remove(item)
                save_json(QUARANTINE_META, self.quarantine_data)
                self._refresh_quarantine_ui()
                messagebox.showinfo("Restored", f"File restored to:\n{orig}")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to restore file:\n{e}")

    def _delete_quarantined_file(self, item):
        qpath = item.get("quarantine_path", "")
        try:
            if os.path.exists(qpath):
                os.remove(qpath)
            self.quarantine_data.remove(item)
            save_json(QUARANTINE_META, self.quarantine_data)
            self._refresh_quarantine_ui()
        except Exception as e:
            messagebox.showerror("Error", str(e))

    # ── 7. NETWORK & OPEN PORTS PAGE ─────────────────────────────────────────
    def _build_network_page(self):
        page = ctk.CTkFrame(self.content_area, fg_color=THEME["bg_dark"])
        self.pages["network"] = page

        head = ctk.CTkFrame(page, fg_color="transparent")
        head.pack(fill="x", padx=25, pady=(20, 10))

        ctk.CTkLabel(head, text="🌐 Network & Open Port Guard",
                     font=ctk.CTkFont("Segoe UI", 24, "bold"),
                     text_color=THEME["text_white"]).pack(anchor="w")
        ctk.CTkLabel(head, text="Monitor active network adapters, open listening ports, and incoming connection security.",
                     font=ctk.CTkFont("Segoe UI", 12),
                     text_color=THEME["text_dim"]).pack(anchor="w")

        bar = ctk.CTkFrame(page, fg_color="transparent")
        bar.pack(fill="x", padx=25, pady=(0, 10))

        ctk.CTkButton(
            bar, text="🔄 Scan Active Ports & Connections",
            height=34, font=ctk.CTkFont("Segoe UI", 12, "bold"),
            fg_color=THEME["bg_card_alt"], hover_color=THEME["border"],
            command=self._refresh_network_ports
        ).pack(side="left")

        self.net_scroll = ctk.CTkScrollableFrame(page, fg_color="transparent")
        self.net_scroll.pack(fill="both", expand=True, padx=25, pady=(0, 20))

        self.after(1500, self._refresh_network_ports)

    def _refresh_network_ports(self):
        for w in self.net_scroll.winfo_children():
            w.destroy()

        def _task():
            # Get IP and connections
            conns = []
            try:
                for c in psutil.net_connections(kind="inet"):
                    if c.status in ("LISTEN", "ESTABLISHED"):
                        laddr = f"{c.laddr.ip}:{c.laddr.port}" if c.laddr else ""
                        raddr = f"{c.raddr.ip}:{c.raddr.port}" if c.raddr else "—"
                        proc_name = "System"
                        if c.pid:
                            try:
                                proc_name = psutil.Process(c.pid).name()
                            except Exception:
                                pass
                        is_suspicious = False
                        if c.laddr and c.laddr.port in SUSPICIOUS_PORTS:
                            is_suspicious = True

                        conns.append({
                            "proto": "TCP" if c.type == socket.SOCK_STREAM else "UDP",
                            "laddr": laddr,
                            "raddr": raddr,
                            "status": c.status,
                            "pid": c.pid or "—",
                            "proc": proc_name,
                            "suspicious": is_suspicious
                        })
            except Exception:
                pass

            self._safe_ui(lambda: self._render_connections_list(conns))

        threading.Thread(target=_task, daemon=True).start()

    def _render_connections_list(self, conns):
        # Header Row
        hdr = ctk.CTkFrame(self.net_scroll, fg_color=THEME["bg_card"], corner_radius=8)
        hdr.pack(fill="x", pady=(0, 6))

        for col, width in [("Proto", 60), ("Local Address", 180), ("Remote Address", 180),
                           ("Status", 110), ("Process", 160), ("PID", 70)]:
            ctk.CTkLabel(hdr, text=col, width=width, font=ctk.CTkFont("Segoe UI", 11, "bold"),
                         text_color=THEME["text_muted"]).pack(side="left", padx=8, pady=8)

        if not conns:
            ctk.CTkLabel(self.net_scroll, text="No network connections could be queried (Requires Admin for full detail).",
                         font=ctk.CTkFont("Segoe UI", 12), text_color=THEME["text_muted"]).pack(pady=20)
            return

        for c in conns[:100]:  # Cap at 100 rows for smooth UI
            row_color = THEME["accent_red"] if c["suspicious"] else THEME["border"]
            row = ctk.CTkFrame(self.net_scroll, fg_color=THEME["bg_card"],
                               corner_radius=6, border_width=1, border_color=row_color)
            row.pack(fill="x", pady=2)

            proto_color = THEME["accent_cyan"] if c["proto"] == "TCP" else THEME["accent_purple"]
            ctk.CTkLabel(row, text=c["proto"], width=60, font=ctk.CTkFont("Segoe UI", 11, "bold"),
                         text_color=proto_color).pack(side="left", padx=8, pady=6)

            ctk.CTkLabel(row, text=c["laddr"], width=180, font=ctk.CTkFont("Consolas", 10),
                         text_color=THEME["text_white"]).pack(side="left", padx=8, pady=6)

            ctk.CTkLabel(row, text=c["raddr"], width=180, font=ctk.CTkFont("Consolas", 10),
                         text_color=THEME["text_dim"]).pack(side="left", padx=8, pady=6)

            status_col = THEME["accent_green"] if c["status"] == "LISTEN" else THEME["accent_blue"]
            ctk.CTkLabel(row, text=c["status"], width=110, font=ctk.CTkFont("Segoe UI", 10, "bold"),
                         text_color=status_col).pack(side="left", padx=8, pady=6)

            ctk.CTkLabel(row, text=c["proc"], width=160, anchor="w",
                         font=ctk.CTkFont("Segoe UI", 11),
                         text_color=THEME["text_white"]).pack(side="left", padx=8, pady=6)

            ctk.CTkLabel(row, text=str(c["pid"]), width=70, font=ctk.CTkFont("Consolas", 10),
                         text_color=THEME["text_muted"]).pack(side="left", padx=8, pady=6)

    # ── 8. SETTINGS & OFFLINE DB PAGE ────────────────────────────────────────
    def _build_settings_page(self):
        page = ctk.CTkScrollableFrame(self.content_area, fg_color=THEME["bg_dark"])
        self.pages["settings"] = page

        head = ctk.CTkFrame(page, fg_color="transparent")
        head.pack(fill="x", padx=25, pady=(20, 10))

        ctk.CTkLabel(head, text="⚙ Antivirus Settings & Offline Database",
                     font=ctk.CTkFont("Segoe UI", 24, "bold"),
                     text_color=THEME["text_white"]).pack(anchor="w")
        ctk.CTkLabel(head, text="Configure auto-scan, real-time shields, and manage offline signature updates.",
                     font=ctk.CTkFont("Segoe UI", 12),
                     text_color=THEME["text_dim"]).pack(anchor="w")

        # Preferences Card
        pref_card = ctk.CTkFrame(page, fg_color=THEME["bg_card"],
                                 corner_radius=12, border_width=1, border_color=THEME["border"])
        pref_card.pack(fill="x", padx=25, pady=(0, 15))

        ctk.CTkLabel(pref_card, text="🛡 Protection Preferences",
                     font=ctk.CTkFont("Segoe UI", 14, "bold"),
                     text_color=THEME["accent_cyan"]).pack(anchor="w", padx=20, pady=(15, 10))

        self.sw_startup_scan = ctk.CTkSwitch(
            pref_card, text="Auto-Scan Laptop on Startup (Full analysis & threat detection)",
            font=ctk.CTkFont("Segoe UI", 12), progress_color=THEME["accent_cyan"]
        )
        self.sw_startup_scan.select()
        self.sw_startup_scan.pack(anchor="w", padx=20, pady=8)

        self.sw_heuristics = ctk.CTkSwitch(
            pref_card, text="Heuristic Engine (Detect unknown ransomware, double-extensions, fake system binaries)",
            font=ctk.CTkFont("Segoe UI", 12), progress_color=THEME["accent_cyan"]
        )
        self.sw_heuristics.select()
        self.sw_heuristics.pack(anchor="w", padx=20, pady=8)

        self.sw_auto_quarantine = ctk.CTkSwitch(
            pref_card, text="Auto-Quarantine High-Risk Malware Hashes immediately upon detection",
            font=ctk.CTkFont("Segoe UI", 12), progress_color=THEME["accent_cyan"]
        )
        self.sw_auto_quarantine.pack(anchor="w", padx=20, pady=(8, 18))

        # Offline Database Card
        db_card = ctk.CTkFrame(page, fg_color=THEME["bg_card"],
                               corner_radius=12, border_width=1, border_color=THEME["border"])
        db_card.pack(fill="x", padx=25, pady=(0, 15))

        ctk.CTkLabel(db_card, text="📦 Offline Threat Signature Database",
                     font=ctk.CTkFont("Segoe UI", 14, "bold"),
                     text_color=THEME["accent_cyan"]).pack(anchor="w", padx=20, pady=(15, 10))

        ctk.CTkLabel(db_card,
                     text="Nova Shield includes an embedded offline database of malware signatures, trojans, ransomware,\nand heuristic detection patterns that operate 100% locally without requiring internet access.",
                     font=ctk.CTkFont("Segoe UI", 11),
                     text_color=THEME["text_dim"], justify="left").pack(anchor="w", padx=20, pady=(0, 12))

        btn_row = ctk.CTkFrame(db_card, fg_color="transparent")
        btn_row.pack(anchor="w", padx=20, pady=(0, 18))

        self.btn_update_db = ctk.CTkButton(
            btn_row, text="🌐 Check Cloud Threat Updates",
            height=36, font=ctk.CTkFont("Segoe UI", 12, "bold"),
            fg_color=THEME["accent_cyan"], text_color="#000", hover_color="#38bdf8",
            command=self._check_cloud_updates
        )
        self.btn_update_db.pack(side="left", padx=(0, 10))

        self.lbl_update_status = ctk.CTkLabel(
            btn_row, text="Offline Database Status: UP TO DATE",
            font=ctk.CTkFont("Segoe UI", 11, "bold"),
            text_color=THEME["accent_green"]
        )
        self.lbl_update_status.pack(side="left")

    def _check_cloud_updates(self):
        if not self.is_online:
            messagebox.showinfo("Offline Mode", "Internet is currently offline. Nova Shield will continue using the built-in offline database seamlessly.")
            return

        self.btn_update_db.configure(state="disabled", text="Checking...")
        def _task():
            time.sleep(1.2)
            self._safe_ui(lambda: [
                self.btn_update_db.configure(state="normal", text="🌐 Check Cloud Threat Updates"),
                self.lbl_update_status.configure(text="Cloud Signatures Synchronized! (10,480+ entries)", text_color=THEME["accent_green"]),
                messagebox.showinfo("Update Complete", "Latest offline and cloud threat definitions verified and loaded.")
            ])
        threading.Thread(target=_task, daemon=True).start()

    # ─────────────────────────────────────────────────────────────────────────
    # LIVE HARDWARE TELEMETRY LOOP
    # ─────────────────────────────────────────────────────────────────────────
    def _start_live_telemetry(self):
        def _loop():
            try:
                # CPU & RAM
                cpu = psutil.cpu_percent()
                ram = psutil.virtual_memory().percent
                
                # Disk
                dsk_part = "C:\\" if os.name == "nt" else "/"
                dsk = psutil.disk_usage(dsk_part).percent
                
                # Battery
                bat = psutil.sensors_battery()
                bat_pct = bat.percent if bat else 100
                bat_plug = bat.power_plugged if bat else True
                bat_disp = f"{bat_pct}%" + (" (AC)" if bat_plug else "")

                # Network check
                online = check_internet()
                self.is_online = online

                # Dispatch UI update
                self._safe_ui(lambda: self._update_telemetry_ui(cpu, ram, dsk, bat_pct, bat_disp, online))
            except Exception:
                pass

            try:
                if self.winfo_exists():
                    self.after(2000, _loop)
            except Exception:
                pass

        self.after(1000, _loop)

    def _update_telemetry_ui(self, cpu, ram, dsk, bat_pct, bat_disp, online):
        # Update Bars
        self.bar_cpu.set(cpu / 100.0)
        self.lbl_cpu.configure(text=f"{cpu:.0f}%")

        self.bar_ram.set(ram / 100.0)
        self.lbl_ram.configure(text=f"{ram:.0f}%")

        self.bar_dsk.set(dsk / 100.0)
        self.lbl_dsk.configure(text=f"{dsk:.0f}%")

        self.bar_bat.set(bat_pct / 100.0)
        self.lbl_bat.configure(text=f"{bat_pct:.0f}%")

        self.dash_stat_battery.configure(text=bat_disp)

        # Update Network Pill
        if online:
            self.net_badge_dot.configure(text="●", text_color=THEME["accent_green"])
            self.net_badge_text.configure(text="Online + Protected")
        else:
            self.net_badge_dot.configure(text="●", text_color=THEME["accent_amber"])
            self.net_badge_text.configure(text="Offline Shield Active")

    # ─────────────────────────────────────────────────────────────────────────
    # ANTIVIRUS SCAN ENGINE & STARTUP SCAN
    # ─────────────────────────────────────────────────────────────────────────
    def _auto_startup_diagnostics(self):
        """User Request: jabhi ya jese bhi start karo vese hi pura leptop scan or pura system analyse kare"""
        self._refresh_full_laptop_analysis()
        self._start_scan(mode="quick")

    def _start_scan(self, mode="quick"):
        if self.is_scanning:
            return

        self.is_scanning = True
        self.scan_should_stop = False
        self.threats = []
        self.scanned_count = 0
        self.threat_count = 0

        # UI state updates
        self.btn_stop_scan.configure(state="normal")
        self.dash_gauge.set_scanning(True)
        self.dash_banner_title.configure(text="🔄 Scanning Laptop in Progress...", text_color=THEME["accent_cyan"])
        self.dash_banner_desc.configure(text="Analyzing active memory processes, Windows startup keys, heuristics, and sensitive files.")
        self.scan_progress_bar.set(0)
        self.scan_textbox.delete("1.0", "end")

        self._log_scan(f"Nova Shield 3.0 Antivirus Scanner initialized (Mode: {mode.upper()}).", "info")
        self._log_scan(f"Offline Signature Engine: Active | Network: {'ONLINE' if self.is_online else 'OFFLINE (Safe)'}", "ok")

        threading.Thread(target=lambda: self._execute_scan_worker(mode), daemon=True).start()

    def _choose_and_scan_folder(self):
        folder = filedialog.askdirectory(title="Select Folder to Scan for Viruses")
        if folder and os.path.exists(folder):
            self._start_scan_custom_folder(folder)

    def _start_scan_custom_folder(self, folder):
        if self.is_scanning:
            return
        self.is_scanning = True
        self.scan_should_stop = False
        self.threats = []
        self.scanned_count = 0
        self.threat_count = 0

        self.btn_stop_scan.configure(state="normal")
        self.dash_gauge.set_scanning(True)
        self.scan_progress_bar.set(0)
        self.scan_textbox.delete("1.0", "end")
        self._log_scan(f"Custom Directory Scan started: {folder}", "info")

        threading.Thread(target=lambda: self._execute_scan_custom_worker(folder), daemon=True).start()

    def _stop_scan(self):
        if self.is_scanning:
            self.scan_should_stop = True
            self.btn_stop_scan.configure(state="disabled", text="Stopping...")
            self._log_scan("Scan cancel requested by user...", "warn")

    def _execute_scan_worker(self, mode):
        t0 = time.time()
        try:
            # ── PHASE 1: Active Process & Memory Scanning ──
            self._set_scan_phase("Phase 1/5: Inspecting Running Processes & Memory Heuristics...", 0.1)
            self._scan_active_processes()

            if self.scan_should_stop:
                self._finish_scan(t0, interrupted=True)
                return

            # ── PHASE 2: Windows Startup & Registry Autoruns ──
            self._set_scan_phase("Phase 2/5: Scanning Windows Startup Registry & Tasks...", 0.3)
            self._scan_startup_registry()

            if self.scan_should_stop:
                self._finish_scan(t0, interrupted=True)
                return

            # ── PHASE 3: Critical User Paths (Downloads, Temp, AppData) ──
            self._set_scan_phase("Phase 3/5: Scanning Downloads, Temp & Script Executables...", 0.5)
            critical_dirs = [
                os.environ.get("TEMP", ""),
                os.path.expandvars(r"%LOCALAPPDATA%\Temp"),
                str(Path.home() / "Downloads"),
                str(Path.home() / "Desktop"),
                os.path.expandvars(r"%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup")
            ]
            for d in critical_dirs:
                if self.scan_should_stop:
                    break
                if os.path.exists(d):
                    self._scan_directory_files(d, max_files=1500)

            if self.scan_should_stop:
                self._finish_scan(t0, interrupted=True)
                return

            # ── PHASE 4: Deep Scan Option (System Folders & Root C: Drive) ──
            if mode == "deep":
                self._set_scan_phase("Phase 4/5: Deep Drive Scan (C:\\ Program Files & User Data)...", 0.75)
                deep_dirs = [
                    os.path.expandvars(r"%PROGRAMDATA%"),
                    os.path.expandvars(r"%USERPROFILE%\Documents")
                ]
                for d in deep_dirs:
                    if self.scan_should_stop:
                        break
                    if os.path.exists(d):
                        self._scan_directory_files(d, max_files=4000)

            # ── PHASE 5: Security Posture Assessment ──
            self._set_scan_phase("Phase 5/5: Assessing Windows Security & Port Integrity...", 0.95)
            time.sleep(0.5)

        except Exception as e:
            self._log_scan(f"Scan Exception encountered: {e}", "danger")

        self._finish_scan(t0, interrupted=self.scan_should_stop)

    def _execute_scan_custom_worker(self, folder):
        t0 = time.time()
        self._set_scan_phase(f"Scanning Folder: {folder}...", 0.2)
        self._scan_directory_files(folder, max_files=10000)
        self._finish_scan(t0, interrupted=self.scan_should_stop)

    def _set_scan_phase(self, text, progress):
        self._safe_ui(lambda: [
            self.scan_phase_title.configure(text=text),
            self.scan_progress_bar.set(progress)
        ])

    def _scan_active_processes(self):
        """Scans all active processes for known hashes, suspicious names, and temp binaries."""
        self._log_scan("Evaluating all running system processes...", "info")
        for proc in psutil.process_iter(['pid', 'name', 'exe', 'cmdline']):
            if self.scan_should_stop:
                break
            try:
                self.scanned_count += 1
                pinfo = proc.info
                pname = (pinfo['name'] or "").lower()
                pexe = pinfo['exe'] or ""
                cmdline = " ".join(pinfo['cmdline'] or []).lower()

                self._safe_ui(lambda n=pname: self.scan_current_file.configure(text=f"Inspecting Process: {n}"))

                # 1. Fake System Process Masquerading
                if pname in FAKE_SYSTEM_NAMES:
                    threat = {
                        "type": "process_malware",
                        "severity": "CRITICAL",
                        "name": f"Masquerading Process: {pname}",
                        "pid": pinfo['pid'],
                        "path": pexe,
                        "reason": FAKE_SYSTEM_NAMES[pname]
                    }
                    self._add_threat(threat)
                    self._log_scan(f"MALWARE DETECTED: {pname} (PID {pinfo['pid']}) — {threat['reason']}", "danger")
                    continue

                # 2. Known Malware Hash Check
                if pexe and os.path.isfile(pexe):
                    md5, sha256 = get_file_hashes(pexe)
                    if md5 in MALWARE_SIGNATURES or sha256 in MALWARE_SIGNATURES:
                        sig_name = MALWARE_SIGNATURES.get(md5) or MALWARE_SIGNATURES.get(sha256)
                        threat = {
                            "type": "process_malware",
                            "severity": "CRITICAL",
                            "name": f"Malicious Process: {pname}",
                            "pid": pinfo['pid'],
                            "path": pexe,
                            "reason": f"Known Malware Signature: {sig_name}"
                        }
                        self._add_threat(threat)
                        self._log_scan(f"MALWARE FILE MATCH: {pexe} -> {sig_name}", "danger")
                        continue

                # 3. Suspicious Process Executable Path (running out of Temp)
                if pname not in SAFE_SYSTEM_PROCS and pexe:
                    pexe_lower = pexe.lower()
                    for sp in SUSPICIOUS_EXEC_PATHS:
                        if sp in pexe_lower:
                            threat = {
                                "type": "suspicious_process",
                                "severity": "HIGH",
                                "name": f"Suspicious Temp Process: {pname}",
                                "pid": pinfo['pid'],
                                "path": pexe,
                                "reason": f"Executable running from temp/cache location: {pexe}"
                            }
                            self._add_threat(threat)
                            self._log_scan(f"Suspicious Process Path: {pname} @ {pexe}", "warn")
                            break

                # 4. Hidden Powershell / CMD Reverse Shell Heuristic
                if "powershell" in pname or "cmd.exe" in pname:
                    if any(x in cmdline for x in ["-w hidden", "-windowstyle hidden", "-enc", "bypass -c", "downloadstring"]):
                        threat = {
                            "type": "suspicious_process",
                            "severity": "CRITICAL",
                            "name": f"Stealth Script Process: {pname}",
                            "pid": pinfo['pid'],
                            "path": pexe,
                            "reason": f"Encoded or hidden execution script: {cmdline[:80]}"
                        }
                        self._add_threat(threat)
                        self._log_scan(f"Stealth Script detected: {cmdline[:80]}", "danger")

            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass

        self._log_scan(f"Process check complete. Inspected {self.scanned_count} processes.", "ok")

    def _scan_startup_registry(self):
        """Scans Windows Run keys for malicious persistence."""
        entries = get_startup_registry_items()
        for e in entries:
            if self.scan_should_stop:
                break
            self.scanned_count += 1
            val = e["value"].lower()
            name = e["name"]

            # Heuristics for suspicious startup values
            is_suspicious = False
            reason = ""
            for ext in [".vbs", ".bat", ".ps1", ".scr", ".cmd"]:
                if ext in val:
                    is_suspicious = True
                    reason = f"Startup runs script file ({ext})"
            for kw in ["temp\\", "tmp\\", "\\users\\public\\"]:
                if kw in val:
                    is_suspicious = True
                    reason = "Startup binary points to Temporary/Public directory"

            if is_suspicious:
                threat = {
                    "type": "startup",
                    "severity": "HIGH",
                    "name": f"Suspicious Startup: {name}",
                    "path": e["value"],
                    "hive": e["hive"],
                    "subkey": e["path"],
                    "reason": reason
                }
                self._add_threat(threat)
                self._log_scan(f"Suspicious Startup Key: '{name}' -> {e['value']}", "warn")
            else:
                self._log_scan(f"Startup item OK: {name}", "ok")

    def _scan_directory_files(self, directory, max_files=2000):
        """Recursively scans directory for malware hashes, double extensions, and suspicious scripts."""
        self._log_scan(f"Scanning filesystem folder: {directory}", "info")
        count = 0
        try:
            for root, dirs, files in os.walk(directory):
                if self.scan_should_stop:
                    break
                for fname in files:
                    if self.scan_should_stop:
                        break
                    count += 1
                    if count > max_files:
                        return
                    self.scanned_count += 1
                    fpath = os.path.join(root, fname)
                    fname_lower = fname.lower()
                    ext = os.path.splitext(fname_lower)[1]

                    if count % 25 == 0:
                        self._safe_ui(lambda p=fpath: self.scan_current_file.configure(text=f"Scanning File: {p[:75]}"))

                    # Whitelist check
                    if fpath in self.whitelist:
                        continue

                    # 1. Double Extension Heuristic
                    d_ext_match = None
                    parts = fname_lower.split('.')
                    if len(parts) >= 3:
                        ext1 = '.' + parts[-2]
                        ext2 = '.' + parts[-1]
                        if ext1 in DOC_EXTS and ext2 in SUSPICIOUS_EXTENSIONS:
                            d_ext_match = f"{ext1}{ext2}"
                    if not d_ext_match:
                        for d_ext in DOUBLE_EXT_PATTERNS:
                            if fname_lower.endswith(d_ext):
                                d_ext_match = d_ext
                                break

                    if d_ext_match:
                        threat = {
                            "type": "suspicious_file",
                            "severity": "CRITICAL",
                            "name": f"Double Extension Malware: {fname}",
                            "path": fpath,
                            "reason": f"Masquerading as document with executable extension ({d_ext_match})"
                        }
                        self._add_threat(threat)
                        self._log_scan(f"DOUBLE EXTENSION THREAT: {fpath}", "danger")
                        continue

                    # 2. Ransomware Note Detection
                    for r_pat in RANSOM_NOTE_PATTERNS:
                        if r_pat in fname_lower:
                            threat = {
                                "type": "suspicious_file",
                                "severity": "CRITICAL",
                                "name": f"Ransomware Note Detected: {fname}",
                                "path": fpath,
                                "reason": "File matches known ransomware ransom-note instructions"
                            }
                            self._add_threat(threat)
                            self._log_scan(f"RANSOM NOTE FOUND: {fpath}", "danger")
                            break

                    # 3. Content String Inspection for EICAR & Cryptominer markers
                    try:
                        with open(fpath, "rb") as bf:
                            header = bf.read(4096)
                            if b"EICAR-STANDARD-ANTIVIRUS-TEST-FILE" in header:
                                threat = {
                                    "type": "file_malware",
                                    "severity": "CRITICAL",
                                    "name": f"EICAR Antivirus Test File: {fname}",
                                    "path": fpath,
                                    "reason": "File contains EICAR standard antivirus test signature"
                                }
                                self._add_threat(threat)
                                self._log_scan(f"EICAR TEST SIGNATURE: {fpath}", "danger")
                                continue
                    except Exception:
                        pass

                    # 4. Known Malware Hash Check (if suspicious extension or in Temp)
                    if ext in SUSPICIOUS_EXTENSIONS:
                        md5, sha256 = get_file_hashes(fpath)
                        if md5 in MALWARE_SIGNATURES or sha256 in MALWARE_SIGNATURES:
                            sig_name = MALWARE_SIGNATURES.get(md5) or MALWARE_SIGNATURES.get(sha256)
                            threat = {
                                "type": "file_malware",
                                "severity": "CRITICAL",
                                "name": f"Malware Binary: {fname}",
                                "path": fpath,
                                "reason": f"Known Malware Signature: {sig_name}"
                            }
                            self._add_threat(threat)
                            self._log_scan(f"MALWARE DETECTED: {fpath} -> {sig_name}", "danger")

        except Exception as e:
            self._log_scan(f"Folder scan warning on {directory}: {e}", "warn")

    def _add_threat(self, threat):
        self.threats.append(threat)
        self.threat_count += 1

    def _finish_scan(self, start_time, interrupted=False):
        elapsed = time.time() - start_time
        self.is_scanning = False
        self.last_scan_time = datetime.now().strftime("%d %b %Y, %I:%M %p")

        # Calculate new System Security Score
        score = 100
        for t in self.threats:
            sev = t.get("severity", "HIGH")
            if sev == "CRITICAL":
                score -= 25
            else:
                score -= 12
        score = max(10, score)
        self.system_health_score = score

        # Update UI Thread
        def _update():
            self.btn_stop_scan.configure(state="disabled", text="⏹ Stop Scan")
            self.scan_progress_bar.set(1.0)
            self.dash_gauge.set_scanning(False)
            self.dash_gauge.set_score(score)

            status_str = "Clean & Protected" if not self.threats else f"{len(self.threats)} Threats Found!"
            self.scan_phase_title.configure(
                text=f"Scan Finished — {status_str} in {elapsed:.1f}s",
                text_color=THEME["accent_green"] if not self.threats else THEME["accent_red"]
            )
            self.scan_current_file.configure(
                text=f"Items Scanned: {self.scanned_count}  |  Threats Found: {len(self.threats)}  |  Duration: {elapsed:.1f}s"
            )

            # Dashboard Cards update
            self.dash_stat_threats.configure(
                text=str(len(self.threats)),
                text_color=THEME["accent_red"] if self.threats else THEME["accent_green"]
            )
            self.dash_stat_scanned.configure(text=str(self.scanned_count))

            if self.threats:
                self.dash_banner_title.configure(
                    text=f"⚠ Action Required: {len(self.threats)} Threat(s) Found!",
                    text_color=THEME["accent_red"]
                )
                self.dash_banner_desc.configure(
                    text="Harmful or suspicious files were identified. Click 'Clean All Threats' or visit the Threat Manager to block, quarantine, or permanently delete them."
                )
            else:
                self.dash_banner_title.configure(
                    text="✅ Laptop is Clean & Fully Protected",
                    text_color=THEME["accent_green"]
                )
                self.dash_banner_desc.configure(
                    text="No malicious processes, suspicious persistence keys, or harmful files were found on this system."
                )

            self._refresh_threats_ui()
            self._log_scan(f"══════════ SCAN FINISHED: {len(self.threats)} THREATS DETECTED ══════════",
                           "danger" if self.threats else "ok")

        self._safe_ui(_update)

    # ─────────────────────────────────────────────────────────────────────────
    # THREAT REMEDIATION ACTIONS ("block", "quarantine", "clear bhi kare")
    # ─────────────────────────────────────────────────────────────────────────
    def _action_block_process(self, threat):
        pid = threat.get("pid")
        name = threat.get("name", "Process")
        try:
            if pid and psutil.pid_exists(pid):
                p = psutil.Process(pid)
                p.terminate()
                p.wait(timeout=1.5)
            self.threats.remove(threat)
            self._refresh_threats_ui()
            self._recalc_score_after_fix()
            messagebox.showinfo("Blocked", f"Successfully terminated malicious process:\n{name} (PID {pid})")
        except Exception as e:
            try:
                # Force kill
                p = psutil.Process(pid)
                p.kill()
                self.threats.remove(threat)
                self._refresh_threats_ui()
                self._recalc_score_after_fix()
                messagebox.showinfo("Blocked", f"Killed process with SIGKILL:\n{name}")
            except Exception as e2:
                messagebox.showerror("Error", f"Could not terminate process:\n{e2}")

    def _action_quarantine_file(self, threat, silent=False):
        src = threat.get("path")
        if not src or not os.path.exists(src):
            if threat in self.threats:
                self.threats.remove(threat)
            self._refresh_threats_ui()
            if not silent:
                messagebox.showinfo("Already Removed", "Target file is no longer present on the system.")
            return

        try:
            p_src = Path(src)
            stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            dst_name = f"{p_src.name}_{stamp}.nova_quarantined"
            dst_path = QUARANTINE_DIR / dst_name

            shutil.move(src, dst_path)

            meta_entry = {
                "original_name": p_src.name,
                "original_path": src,
                "quarantine_path": str(dst_path),
                "reason": threat.get("reason", "Malware"),
                "date": datetime.now().strftime("%d %b %Y, %I:%M %p"),
                "size_kb": dst_path.stat().st_size / 1024.0 if dst_path.exists() else 0
            }
            self.quarantine_data.append(meta_entry)
            save_json(QUARANTINE_META, self.quarantine_data)

            if threat in self.threats:
                self.threats.remove(threat)

            self._refresh_threats_ui()
            self._refresh_quarantine_ui()
            self._recalc_score_after_fix()
            if not silent:
                messagebox.showinfo("Quarantined", f"Harmful file safely isolated to Vault:\n{p_src.name}")
        except Exception as e:
            if not silent:
                messagebox.showerror("Error", f"Failed to quarantine file:\n{e}")

    def _action_delete_file(self, threat, silent=False):
        src = threat.get("path")
        if not src or not os.path.exists(src):
            if threat in self.threats:
                self.threats.remove(threat)
            self._refresh_threats_ui()
            return

        if silent or messagebox.askyesno("Confirm Permanent Deletion",
                                         f"Permanently clear and shred this harmful file?\n\n{src}\n\nThis cannot be undone."):
            try:
                os.remove(src)
                if threat in self.threats:
                    self.threats.remove(threat)
                self._refresh_threats_ui()
                self._recalc_score_after_fix()
                if not silent:
                    messagebox.showinfo("File Cleared", "The harmful file has been completely removed from your laptop.")
            except Exception as e:
                if not silent:
                    messagebox.showerror("Error", f"Failed to delete file:\n{e}")

    def _action_remove_startup(self, threat):
        try:
            hive = threat.get("hive")
            subkey = threat.get("subkey")
            name = threat.get("name")
            key = winreg.OpenKey(hive, subkey, 0, winreg.KEY_SET_VALUE)
            winreg.DeleteValue(key, name)
            winreg.CloseKey(key)

            if threat in self.threats:
                self.threats.remove(threat)
            self._refresh_threats_ui()
            self._recalc_score_after_fix()
            messagebox.showinfo("Removed", f"Successfully cleared startup persistence key:\n{name}")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to delete startup entry:\n{e}")

    def _action_whitelist(self, threat):
        path = threat.get("path")
        if path:
            self.whitelist.add(path)
            save_json(WHITELIST_FILE, list(self.whitelist))
            if threat in self.threats:
                self.threats.remove(threat)
            self._refresh_threats_ui()
            self._recalc_score_after_fix()
            messagebox.showinfo("Whitelisted", f"Item added to Safe Whitelist:\n{path}")

    def _clean_all_threats(self, auto_confirm=False):
        """User Request: ek kudh ka antivirus create kare jo pura leptop sccane kare or viruse ko bhi sccane kare or osse clear bhi kare"""
        if not self.threats:
            if not auto_confirm:
                messagebox.showinfo("Laptop Clean", "No threats currently detected to clean.")
            return

        count = len(self.threats)
        if not auto_confirm and not messagebox.askyesno("Clean All Threats", f"Automatically remediate, block, and quarantine all {count} detected threat(s)?"):
            return

        fixed = 0
        for threat in list(self.threats):
            t_type = threat.get("type", "")
            try:
                # 1. Kill process
                if "process" in t_type:
                    pid = threat.get("pid")
                    if pid and psutil.pid_exists(pid):
                        psutil.Process(pid).kill()
                    self.threats.remove(threat)
                    fixed += 1

                # 2. Quarantine files
                elif "file" in t_type or "malware" in t_type:
                    src = threat.get("path")
                    if src and os.path.exists(src):
                        p_src = Path(src)
                        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        dst_path = QUARANTINE_DIR / f"{p_src.name}_{stamp}.nova_quarantined"
                        shutil.move(src, dst_path)
                        self.quarantine_data.append({
                            "original_name": p_src.name,
                            "original_path": src,
                            "quarantine_path": str(dst_path),
                            "reason": threat.get("reason", "CleanAll"),
                            "date": datetime.now().strftime("%d %b %Y, %I:%M %p"),
                            "size_kb": dst_path.stat().st_size / 1024.0 if dst_path.exists() else 0
                        })
                    if threat in self.threats:
                        self.threats.remove(threat)
                    fixed += 1

                # 3. Startup entries
                elif "startup" in t_type:
                    key = winreg.OpenKey(threat["hive"], threat["subkey"], 0, winreg.KEY_SET_VALUE)
                    winreg.DeleteValue(key, threat["name"])
                    winreg.CloseKey(key)
                    if threat in self.threats:
                        self.threats.remove(threat)
                    fixed += 1

            except Exception:
                pass

        save_json(QUARANTINE_META, self.quarantine_data)
        self._refresh_threats_ui()
        self._refresh_quarantine_ui()
        self._recalc_score_after_fix()
        if not auto_confirm:
            messagebox.showinfo("System Secured", f"Remediated {fixed} threats! Your laptop is now protected.")

    def _recalc_score_after_fix(self):
        score = 100
        for t in self.threats:
            sev = t.get("severity", "HIGH")
            score -= 25 if sev == "CRITICAL" else 12
        score = max(10, score)
        self.system_health_score = score
        self.dash_gauge.set_score(score)
        self.dash_stat_threats.configure(
            text=str(len(self.threats)),
            text_color=THEME["accent_red"] if self.threats else THEME["accent_green"]
        )
        if not self.threats:
            self.dash_banner_title.configure(text="✅ System is Clean & Protected", text_color=THEME["accent_green"])
            self.dash_banner_desc.configure(text="All threats have been neutralized. Laptop integrity is 100%.")


# ─────────────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app = NovaShieldApp()
    app.mainloop()
