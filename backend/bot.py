import os
from pathlib import Path
from telegram import (
    WebAppInfo,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    MenuButtonCommands,
    MenuButtonWebApp,
)
from telegram.ext import ApplicationBuilder, CommandHandler


def load_env():
    """
    Minimal .env loader so the bot can reuse the same credentials file
    as the Node backend without adding third-party dependencies.
    """
    candidates = [
        Path(__file__).resolve().parent / ".env",
        Path(__file__).resolve().parent.parent / ".env",
    ]
    for env_path in candidates:
        if not env_path.is_file():
            continue
        with env_path.open("r", encoding="utf-8") as fh:
            for raw_line in fh:
                line = raw_line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                os.environ.setdefault(key, value)
        break


load_env()

BOT_TOKEN = os.getenv("BOT_TOKEN") 
WEBAPP_URL = os.getenv("WEBAPP_URL")
INLINE_BUTTON_ENABLED = os.getenv("INLINE_BUTTON_ENABLED", "true").lower() == "true"
MENU_BUTTON_MODE = os.getenv("MENU_BUTTON_MODE", "commands").lower()
MENU_BUTTON_TEXT = os.getenv("MENU_BUTTON_TEXT", "Открыть мини-приложение")


async def start(update, context):
    if not INLINE_BUTTON_ENABLED:
        await update.message.reply_text(
            "Нажмите кнопку меню Telegram (внизу слева) чтобы открыть мини-приложение."
        )
        return

    webapp = WebAppInfo(url=WEBAPP_URL)
    keyboard = [[InlineKeyboardButton("Открыть мини-приложение", web_app=webapp)]]
    await update.message.reply_text(
        "Мини-приложение готово:",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


async def configure_menu(application):
    if MENU_BUTTON_MODE == "commands":
        await application.bot.set_chat_menu_button(menu_button=MenuButtonCommands())
    elif MENU_BUTTON_MODE == "webapp":
        await application.bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text=MENU_BUTTON_TEXT,
                web_app=WebAppInfo(url=WEBAPP_URL),
            )
        )


if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN is not configured (set it in .env or the environment)")

if not WEBAPP_URL:
    raise RuntimeError("WEBAPP_URL is not configured (set it in .env or the environment)")

app = ApplicationBuilder().token(BOT_TOKEN).build()
app.post_init = configure_menu
app.add_handler(CommandHandler("start", start))
app.run_polling()
