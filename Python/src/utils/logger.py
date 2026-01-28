"""
Logger utility for structured logging with file output and console display
"""
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Optional
from colorama import init, Fore, Style

# Initialize colorama for Windows support
init(autoreset=True)


class Logger:
    """Logger class for structured logging"""

    _logs_dir = Path("logs")
    _spinner_frames = ["⏳", "⌛", "⏳"]
    _spinner_index = 0

    @staticmethod
    def _get_log_file_name() -> Path:
        """Get log file name based on current date"""
        date = datetime.now().strftime("%Y-%m-%d")
        return Logger._logs_dir / f"bot-{date}.log"

    @staticmethod
    def _ensure_logs_dir() -> None:
        """Ensure logs directory exists"""
        Logger._logs_dir.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def _write_to_file(message: str) -> None:
        """Write message to log file"""
        try:
            Logger._ensure_logs_dir()
            log_file = Logger._get_log_file_name()
            timestamp = datetime.now().isoformat()
            log_entry = f"[{timestamp}] {message}\n"
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(log_entry)
        except Exception:
            # Silently fail to avoid infinite loops
            pass

    @staticmethod
    def _strip_ansi(text: str) -> str:
        """Remove ANSI color codes for file logging"""
        return re.sub(r"\x1b\[\d+m", "", text)

    @staticmethod
    def _format_address(address: str) -> str:
        """Format Ethereum address for display"""
        return f"{address[:6]}...{address[-4:]}"

    @staticmethod
    def _mask_address(address: str) -> str:
        """Mask Ethereum address for privacy"""
        return f"{address[:6]}{'*' * 34}{address[-4:]}"

    @staticmethod
    def header(title: str) -> None:
        """Print header with title"""
        line = "━" * 70
        print(f"\n{Fore.CYAN}{line}")
        print(f"{Fore.CYAN}{Style.BRIGHT}  {title}")
        print(f"{Fore.CYAN}{line}\n")
        Logger._write_to_file(f"HEADER: {title}")

    @staticmethod
    def info(message: str) -> None:
        """Print info message"""
        print(f"{Fore.BLUE}ℹ {message}")
        Logger._write_to_file(f"INFO: {message}")

    @staticmethod
    def success(message: str) -> None:
        """Print success message"""
        print(f"{Fore.GREEN}✓ {message}")
        Logger._write_to_file(f"SUCCESS: {message}")

    @staticmethod
    def warning(message: str) -> None:
        """Print warning message"""
        print(f"{Fore.YELLOW}⚠ {message}")
        Logger._write_to_file(f"WARNING: {message}")

    @staticmethod
    def error(message: str) -> None:
        """Print error message"""
        print(f"{Fore.RED}✗ {message}")
        Logger._write_to_file(f"ERROR: {message}")

    @staticmethod
    def trade(trader_address: str, action: str, details: dict[str, Any]) -> None:
        """Print trade information"""
        line = "─" * 70
        print(f"\n{Fore.MAGENTA}{line}")
        print(f"{Fore.MAGENTA}{Style.BRIGHT}📊 NEW TRADE DETECTED")
        print(f"{Fore.WHITE}Trader: {Logger._format_address(trader_address)}")
        print(f"{Fore.WHITE}Action: {Style.BRIGHT}{action}")

        if details.get("asset"):
            print(f"{Fore.WHITE}Asset:  {Logger._format_address(details['asset'])}")

        if details.get("side"):
            side_color = Fore.GREEN if details["side"] == "BUY" else Fore.RED
            print(f"{Fore.WHITE}Side:   {side_color}{Style.BRIGHT}{details['side']}")

        if details.get("amount"):
            print(f"{Fore.WHITE}Amount: {Fore.YELLOW}${details['amount']}")

        if details.get("price"):
            print(f"{Fore.WHITE}Price:  {Fore.CYAN}{details['price']}")

        if details.get("eventSlug") or details.get("slug"):
            slug = details.get("eventSlug") or details.get("slug")
            market_url = f"https://polymarket.com/event/{slug}"
            print(f"{Fore.WHITE}Market: {Fore.BLUE}{market_url}")

        if details.get("transactionHash"):
            tx_url = f"https://polygonscan.com/tx/{details['transactionHash']}"
            print(f"{Fore.WHITE}TX:     {Fore.BLUE}{tx_url}")

        print(f"{Fore.MAGENTA}{line}\n")

        # Log to file
        trade_log = f"TRADE: {Logger._format_address(trader_address)} - {action}"
        if details.get("side"):
            trade_log += f" | Side: {details['side']}"
        if details.get("amount"):
            trade_log += f" | Amount: ${details['amount']}"
        if details.get("price"):
            trade_log += f" | Price: {details['price']}"
        if details.get("title"):
            trade_log += f" | Market: {details['title']}"
        if details.get("transactionHash"):
            trade_log += f" | TX: {details['transactionHash']}"
        Logger._write_to_file(trade_log)

    @staticmethod
    def balance(my_balance: float, trader_balance: float, trader_address: str) -> None:
        """Print balance information"""
        print(f"{Fore.WHITE}Capital (USDC + Positions):")
        print(f"{Fore.WHITE}  Your total capital:   {Fore.GREEN}{Style.BRIGHT}${my_balance:.2f}")
        print(
            f"{Fore.WHITE}  Trader total capital: {Fore.BLUE}{Style.BRIGHT}${trader_balance:.2f} ({Logger._format_address(trader_address)})"
        )

    @staticmethod
    def order_result(success: bool, message: str) -> None:
        """Print order execution result"""
        if success:
            print(f"{Fore.GREEN}✓ {Fore.GREEN}{Style.BRIGHT}Order executed: {message}")
            Logger._write_to_file(f"ORDER SUCCESS: {message}")
        else:
            print(f"{Fore.RED}✗ {Fore.RED}{Style.BRIGHT}Order failed: {message}")
            Logger._write_to_file(f"ORDER FAILED: {message}")

    @staticmethod
    def startup(traders: list[str], my_wallet: str) -> None:
        """Print startup banner"""
        print("\n")

        # ASCII Art Logo
        c = {
            "reset": Style.RESET_ALL,
            "bold": Style.BRIGHT,
            "cyan": Fore.CYAN,
            "blue": Fore.BLUE,
            "purple": Fore.MAGENTA,
            "magenta": Fore.MAGENTA,
            "green": Fore.GREEN,
            "yellow": Fore.YELLOW,
            "gray": Fore.WHITE,
            "white": Fore.WHITE,
            "border": Fore.CYAN,
        }

        print(f"{c['border']}{c['bold']}╔══════════════════════════════════════════════════════════════════╗{c['reset']}")
        print(f"{c['border']}║{c['reset']}                                                                  {c['border']}║{c['reset']}")
        print(f"{c['border']}║{c['reset']}{c['cyan']}{c['bold']}          {'  ____       '}{c['blue']}{'_        '}{c['purple']}{'____                 '}{c['magenta']}{'             '}{c['border']}║{c['reset']}")
        print(f"{c['border']}║{c['reset']}{c['cyan']}{c['bold']}          {' |  _ \\ ___ '}{c['blue']}{'| |_   _ '}{c['purple']}{'/ ___|___  '}{c['magenta']}{'_ __  _   _ '}{'            '}{c['border']}║{c['reset']}")
        print(f"{c['border']}║{c['reset']}{c['cyan']}{c['bold']}          {' | |_) / _ \\'}{c['blue']}{'| | | | | '}{c['purple']}{'|   / _ \\'}{c['magenta']}{'| \'_ \\| | | |'}{'            '}{c['border']}║{c['reset']}")
        print(f"{c['border']}║{c['reset']}{c['blue']}{c['bold']}          {' |  __/ (_) '}{c['purple']}{'| | |_| | '}{c['magenta']}{'|__| (_) | |_) | |_| |'}{'            '}{c['border']}║{c['reset']}")
        print(f"{c['border']}║{c['reset']}{c['blue']}{c['bold']}          {' |_|   \\___/'}{c['purple']}{'|_|\\__, |'}{c['magenta']}{'\\____\\___/| .__/ \\__, |'}{'            '}{c['border']}║{c['reset']}")
        print(f"{c['border']}║{c['reset']}{c['purple']}          {'               '}{c['magenta']}{'|___/            |_|    |___/ '}{'           '}{c['border']}║{c['reset']}")
        print(f"{c['border']}║{c['reset']}                                                                  {c['border']}║{c['reset']}")
        print(f"{c['border']}║{c['reset']}{c['gray']}                            {c['cyan']}{c['bold']}╭─────────╮{c['reset']}                           {c['border']}║{c['reset']}")
        print(f"{c['border']}║{c['reset']}{c['gray']}                            {c['cyan']}{c['bold']}│{c['white']}{c['bold']}    V3   {c['cyan']}│{c['reset']}                           {c['border']}║{c['reset']}")
        print(f"{c['border']}║{c['reset']}{c['gray']}                            {c['cyan']}{c['bold']}╰─────────╯{c['reset']}                           {c['border']}║{c['reset']}")
        print(f"{c['border']}║{c['reset']}                                                                  {c['border']}║{c['reset']}")
        print(f"{c['border']}║{c['reset']}{c['yellow']}{c['bold']}              ⚡ Copy the best, automate success ⚡{c['reset']}               {c['border']}║{c['reset']}")
        print(f"{c['border']}║{c['reset']}                                                                  {c['border']}║{c['reset']}")
        print(f"{c['border']}{c['bold']}╚══════════════════════════════════════════════════════════════════╝{c['reset']}")
        print(f"{c['border']}{'━' * 68}{c['reset']}")
        print("\n")

        print(f"{Fore.CYAN}📊 Tracking Traders:")
        for index, address in enumerate(traders, 1):
            print(f"{Fore.WHITE}   {index}. {address}")
        print(f"{Fore.CYAN}\n💼 Your Wallet:")
        print(f"{Fore.WHITE}   {Logger._mask_address(my_wallet)}\n")

    @staticmethod
    def db_connection(traders: list[str], counts: list[int]) -> None:
        """Print database connection status"""
        print(f"\n{Fore.CYAN}📦 Database Status:")
        for index, address in enumerate(traders):
            count_str = f"{Fore.YELLOW}{counts[index]} trades"
            print(f"{Fore.WHITE}   {Logger._format_address(address)}: {count_str}")
        print("")

    @staticmethod
    def separator() -> None:
        """Print separator line"""
        print(f"{Fore.WHITE}{Style.DIM}{'─' * 70}")

    @staticmethod
    def waiting(trader_count: int, extra_info: Optional[str] = None) -> None:
        """Print waiting message with spinner"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        spinner = Logger._spinner_frames[Logger._spinner_index % len(Logger._spinner_frames)]
        Logger._spinner_index += 1

        message = (
            f"{spinner} Waiting for trades from {trader_count} trader(s)... ({extra_info})"
            if extra_info
            else f"{spinner} Waiting for trades from {trader_count} trader(s)..."
        )

        print(f"{Fore.WHITE}{Style.DIM}[{timestamp}] {Fore.CYAN}{message}  ", end="\r")

    @staticmethod
    def clear_line() -> None:
        """Clear current line"""
        print("\r" + " " * 100 + "\r", end="")

    @staticmethod
    def my_positions(
        wallet: str,
        count: int,
        top_positions: list[dict[str, Any]],
        overall_pnl: float,
        total_value: float,
        initial_value: float,
        current_balance: float,
    ) -> None:
        """Print my positions information"""
        print(f"\n{Fore.MAGENTA}{Style.BRIGHT}💼 YOUR POSITIONS")
        print(f"{Fore.WHITE}   Wallet: {Logger._format_address(wallet)}")
        print("")

        balance_str = f"{Fore.YELLOW}{Style.BRIGHT}${current_balance:.2f}"
        total_portfolio = current_balance + total_value
        portfolio_str = f"{Fore.CYAN}{Style.BRIGHT}${total_portfolio:.2f}"

        print(f"{Fore.WHITE}   💰 Available Cash:    {balance_str}")
        print(f"{Fore.WHITE}   📊 Total Portfolio:   {portfolio_str}")

        if count == 0:
            print(f"{Fore.WHITE}\n   No open positions")
        else:
            count_str = f"{Fore.GREEN}{count} position{'s' if count > 1 else ''}"
            pnl_color = Fore.GREEN if overall_pnl >= 0 else Fore.RED
            pnl_sign = "+" if overall_pnl >= 0 else ""
            profit_str = f"{pnl_color}{Style.BRIGHT}{pnl_sign}{overall_pnl:.1f}%"
            value_str = f"{Fore.CYAN}${total_value:.2f}"
            initial_str = f"{Fore.WHITE}${initial_value:.2f}"

            print("")
            print(f"{Fore.WHITE}   📈 Open Positions:    {count_str}")
            print(f"{Fore.WHITE}      Invested:          {initial_str}")
            print(f"{Fore.WHITE}      Current Value:     {value_str}")
            print(f"{Fore.WHITE}      Profit/Loss:       {profit_str}")

            # Show top positions
            if top_positions:
                print(f"{Fore.WHITE}\n   🔝 Top Positions:")
                for pos in top_positions:
                    pnl_color = Fore.GREEN if pos.get("percentPnl", 0) >= 0 else Fore.RED
                    pnl_sign = "+" if pos.get("percentPnl", 0) >= 0 else ""
                    avg_price = pos.get("avgPrice", 0)
                    cur_price = pos.get("curPrice", 0)
                    title = pos.get("title", "")[:45]
                    if len(pos.get("title", "")) > 45:
                        title += "..."
                    print(f"{Fore.WHITE}      • {pos.get('outcome', '')} - {title}")
                    print(
                        f"{Fore.WHITE}        Value: {Fore.CYAN}${pos.get('currentValue', 0):.2f} | PnL: {pnl_color}{pnl_sign}{pos.get('percentPnl', 0):.1f}%"
                    )
                    print(
                        f"{Fore.WHITE}        Bought @ {Fore.YELLOW}{(avg_price * 100):.1f}¢ | Current @ {Fore.YELLOW}{(cur_price * 100):.1f}¢"
                    )
        print("")

    @staticmethod
    def traders_positions(
        traders: list[str],
        position_counts: list[int],
        position_details: Optional[list[list[dict[str, Any]]]] = None,
        profitabilities: Optional[list[float]] = None,
    ) -> None:
        """Print traders positions information"""
        print(f"\n{Fore.CYAN}📈 TRADERS YOU'RE COPYING")
        for index, address in enumerate(traders):
            count = position_counts[index] if index < len(position_counts) else 0
            count_str = (
                f"{Fore.GREEN}{count} position{'s' if count > 1 else ''}"
                if count > 0
                else f"{Fore.WHITE}0 positions"
            )

            # Add profitability if available
            profit_str = ""
            if profitabilities and index < len(profitabilities) and count > 0:
                pnl = profitabilities[index]
                pnl_color = Fore.GREEN if pnl >= 0 else Fore.RED
                pnl_sign = "+" if pnl >= 0 else ""
                profit_str = f" | {pnl_color}{Style.BRIGHT}{pnl_sign}{pnl:.1f}%"

            print(f"{Fore.WHITE}   {Logger._format_address(address)}: {count_str}{profit_str}")

            # Show position details if available
            if position_details and index < len(position_details) and position_details[index]:
                for pos in position_details[index]:
                    pnl_color = Fore.GREEN if pos.get("percentPnl", 0) >= 0 else Fore.RED
                    pnl_sign = "+" if pos.get("percentPnl", 0) >= 0 else ""
                    avg_price = pos.get("avgPrice", 0)
                    cur_price = pos.get("curPrice", 0)
                    title = pos.get("title", "")[:40]
                    if len(pos.get("title", "")) > 40:
                        title += "..."
                    print(f"{Fore.WHITE}      • {pos.get('outcome', '')} - {title}")
                    print(
                        f"{Fore.WHITE}        Value: {Fore.CYAN}${pos.get('currentValue', 0):.2f} | PnL: {pnl_color}{pnl_sign}{pos.get('percentPnl', 0):.1f}%"
                    )
                    print(
                        f"{Fore.WHITE}        Bought @ {Fore.YELLOW}{(avg_price * 100):.1f}¢ | Current @ {Fore.YELLOW}{(cur_price * 100):.1f}¢"
                    )
        print("")
