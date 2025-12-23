#!/usr/bin/env python3
"""
G-Press Demo Video Generator v2
Video demo professionale con screenshot grandi, testo leggibile e musica
"""

from moviepy import *
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
import os

# Configurazione
OUTPUT_FILE = "/home/ubuntu/g-press/G-PRESS_DEMO_VIDEO_v2.mp4"
MUSIC_FILE = "/home/ubuntu/g-press/background_music.mp3"
VIDEO_SIZE = (1920, 1080)
FPS = 30

# Colori
BG_DARK = (18, 18, 18)  # Nero quasi puro
GREEN = (76, 175, 80)  # Verde G-Press
WHITE = (255, 255, 255)
GRAY = (180, 180, 180)

# Font sizes
TITLE_SIZE = 80
SUBTITLE_SIZE = 36
DESC_SIZE = 28

# Screenshot e contenuti
SLIDES = [
    {
        "image": "/home/ubuntu/gpress-pitch-v2/assets/screen_home.jpg",
        "title": "Dashboard Principale",
        "subtitle": "9.177 Giornalisti Italiani",
        "bullets": ["Autopilota Intelligente AI", "Filtri per categoria e paese", "Invio con un solo tap"]
    },
    {
        "image": "/home/ubuntu/gpress-pitch-v2/assets/screen_ai.jpg",
        "title": "AI Journalist",
        "subtitle": "Knowledge Base Intelligente",
        "bullets": ["Carica documenti aziendali", "L'AI impara il tuo stile", "Genera articoli perfetti"]
    },
    {
        "image": "/home/ubuntu/gpress-pitch-v2/assets/screen_scraping.jpg",
        "title": "Trova Email",
        "subtitle": "Scraping Automatico",
        "bullets": ["Inserisci nome testata", "Trova email pubbliche", "100% legale e GDPR compliant"]
    },
    {
        "image": "/home/ubuntu/gpress-pitch-v2/assets/screen_stats.jpg",
        "title": "Analytics Real-Time",
        "subtitle": "Statistiche Email Dettagliate",
        "bullets": ["Inviate e consegnate", "Aperture e click", "Bounce e spam report"]
    },
    {
        "image": "/home/ubuntu/gpress-pitch-v2/assets/screen_history.jpg",
        "title": "Storico Completo",
        "subtitle": "Traccia Ogni Comunicato",
        "bullets": ["Cronologia invii", "Destinatari per articolo", "Status e engagement"]
    }
]

def get_font(size, bold=True):
    """Ottiene un font con fallback"""
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf"
    ]
    for path in font_paths:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

def create_solid_background(size, color):
    """Crea sfondo solido"""
    img = Image.new('RGB', size, color)
    return np.array(img)

def create_text_clip(text, font_size, color, duration, position, bold=True, start=0):
    """Crea un clip di testo"""
    font = get_font(font_size, bold)
    
    # Calcola dimensioni
    dummy = Image.new('RGBA', (1, 1))
    draw = ImageDraw.Draw(dummy)
    bbox = draw.textbbox((0, 0), text, font=font)
    w, h = bbox[2] - bbox[0] + 40, bbox[3] - bbox[1] + 20
    
    # Crea immagine testo
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.text((20, 10), text, font=font, fill=color + (255,))
    
    clip = (ImageClip(np.array(img))
           .with_duration(duration)
           .with_start(start)
           .with_position(position))
    
    return clip

def create_bullet_point(text, font_size, color, y_offset):
    """Crea un bullet point con pallino verde"""
    font = get_font(font_size, bold=False)
    
    # Calcola dimensioni
    dummy = Image.new('RGBA', (1, 1))
    draw = ImageDraw.Draw(dummy)
    bbox = draw.textbbox((0, 0), text, font=font)
    w, h = bbox[2] - bbox[0] + 80, bbox[3] - bbox[1] + 20
    
    # Crea immagine
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Pallino verde
    draw.ellipse([20, h//2 - 6, 32, h//2 + 6], fill=GREEN + (255,))
    
    # Testo
    draw.text((50, 5), text, font=font, fill=color + (255,))
    
    return np.array(img)

def add_phone_frame(screenshot_path, target_height=800):
    """Carica screenshot e aggiunge un frame telefono simulato"""
    if not os.path.exists(screenshot_path):
        # Placeholder se immagine non esiste
        img = Image.new('RGB', (400, 800), (50, 50, 50))
        draw = ImageDraw.Draw(img)
        draw.text((150, 400), "?", fill=(100, 100, 100))
        return np.array(img)
    
    # Carica immagine
    img = Image.open(screenshot_path).convert('RGB')
    
    # Ridimensiona mantenendo aspect ratio
    aspect = img.width / img.height
    new_height = target_height
    new_width = int(new_height * aspect)
    img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Aggiungi bordo arrotondato (simulato con padding)
    padding = 8
    frame_color = (40, 40, 40)
    framed = Image.new('RGB', (new_width + padding*2, new_height + padding*2), frame_color)
    framed.paste(img, (padding, padding))
    
    return np.array(framed)

def create_slide_clip(slide_data, duration=6):
    """Crea una slide con layout professionale"""
    
    # Sfondo nero
    bg = create_solid_background(VIDEO_SIZE, BG_DARK)
    bg_clip = ImageClip(bg).with_duration(duration)
    
    clips = [bg_clip]
    
    # Screenshot grande a sinistra (centrato verticalmente)
    phone_img = add_phone_frame(slide_data["image"], target_height=850)
    phone_h, phone_w = phone_img.shape[:2]
    phone_x = 150
    phone_y = (VIDEO_SIZE[1] - phone_h) // 2
    
    phone_clip = (ImageClip(phone_img)
                 .with_duration(duration)
                 .with_position((phone_x, phone_y))
                 .with_effects([vfx.CrossFadeIn(0.8)]))
    clips.append(phone_clip)
    
    # Testo a destra dello screenshot
    text_x = phone_x + phone_w + 100
    
    # Titolo grande
    title_clip = create_text_clip(
        slide_data["title"], 
        TITLE_SIZE, 
        WHITE, 
        duration - 0.3,
        (text_x, 200),
        bold=True,
        start=0.3
    ).with_effects([vfx.CrossFadeIn(0.5)])
    clips.append(title_clip)
    
    # Linea verde accent
    line = Image.new('RGB', (300, 4), GREEN)
    line_clip = (ImageClip(np.array(line))
                .with_duration(duration - 0.5)
                .with_start(0.5)
                .with_position((text_x, 300))
                .with_effects([vfx.CrossFadeIn(0.3)]))
    clips.append(line_clip)
    
    # Sottotitolo
    subtitle_clip = create_text_clip(
        slide_data["subtitle"],
        SUBTITLE_SIZE,
        GREEN,
        duration - 0.6,
        (text_x, 330),
        bold=True,
        start=0.6
    ).with_effects([vfx.CrossFadeIn(0.5)])
    clips.append(subtitle_clip)
    
    # Bullet points
    for i, bullet in enumerate(slide_data["bullets"]):
        bullet_img = create_bullet_point(bullet, DESC_SIZE, GRAY, 0)
        bullet_clip = (ImageClip(bullet_img)
                      .with_duration(duration - 1.0 - i*0.3)
                      .with_start(1.0 + i*0.3)
                      .with_position((text_x, 420 + i*60))
                      .with_effects([vfx.CrossFadeIn(0.4)]))
        clips.append(bullet_clip)
    
    return CompositeVideoClip(clips, size=VIDEO_SIZE)

def create_intro_clip(duration=5):
    """Intro con logo e titolo"""
    bg = create_solid_background(VIDEO_SIZE, BG_DARK)
    bg_clip = ImageClip(bg).with_duration(duration)
    
    clips = [bg_clip]
    
    # Logo G-Press (carica se esiste)
    logo_path = "/home/ubuntu/gpress-pitch-v2/assets/logo.png"
    if os.path.exists(logo_path):
        logo = Image.open(logo_path).convert('RGBA')
        logo = logo.resize((300, 300), Image.Resampling.LANCZOS)
        logo_clip = (ImageClip(np.array(logo))
                    .with_duration(duration)
                    .with_position(("center", 250))
                    .with_effects([vfx.CrossFadeIn(1)]))
        clips.append(logo_clip)
    
    # Titolo
    title_clip = create_text_clip(
        "G-Press",
        100,
        GREEN,
        duration,
        ("center", 580),
        bold=True,
        start=0.5
    ).with_effects([vfx.CrossFadeIn(0.8)])
    clips.append(title_clip)
    
    # Sottotitolo
    sub_clip = create_text_clip(
        "Sistema Proprietario PR • GROWVERSE",
        32,
        GRAY,
        duration - 1,
        ("center", 700),
        bold=False,
        start=1
    ).with_effects([vfx.CrossFadeIn(0.5)])
    clips.append(sub_clip)
    
    return CompositeVideoClip(clips, size=VIDEO_SIZE)

def create_savings_clip(duration=6):
    """Slide risparmio economico"""
    bg = create_solid_background(VIDEO_SIZE, BG_DARK)
    bg_clip = ImageClip(bg).with_duration(duration)
    
    clips = [bg_clip]
    
    # Titolo
    title_clip = create_text_clip(
        "Risparmio Annuale",
        80,
        WHITE,
        duration,
        ("center", 150),
        bold=True,
        start=0.3
    ).with_effects([vfx.CrossFadeIn(0.5)])
    clips.append(title_clip)
    
    # Numero grande
    amount_clip = create_text_clip(
        "€21.840 - €30.240",
        120,
        GREEN,
        duration - 0.5,
        ("center", 350),
        bold=True,
        start=0.8
    ).with_effects([vfx.CrossFadeIn(0.8)])
    clips.append(amount_clip)
    
    # Sottotitolo
    sub_clip = create_text_clip(
        "vs Agenzia DPR Tradizionale",
        36,
        GRAY,
        duration - 1,
        ("center", 520),
        bold=False,
        start=1.2
    ).with_effects([vfx.CrossFadeIn(0.5)])
    clips.append(sub_clip)
    
    # Dettagli
    details = [
        "✓ Canone agenzia: €200/mese = €2.400/anno",
        "✓ Tempo risparmiato: 54 ore/mese = €16.200-27.000/anno",
        "✓ Nessun costo per email aggiuntive"
    ]
    
    for i, detail in enumerate(details):
        detail_clip = create_text_clip(
            detail,
            24,
            GRAY,
            duration - 1.5 - i*0.2,
            ("center", 620 + i*45),
            bold=False,
            start=1.5 + i*0.2
        ).with_effects([vfx.CrossFadeIn(0.4)])
        clips.append(detail_clip)
    
    return CompositeVideoClip(clips, size=VIDEO_SIZE)

def create_outro_clip(duration=5):
    """Outro con call to action"""
    bg = create_solid_background(VIDEO_SIZE, BG_DARK)
    bg_clip = ImageClip(bg).with_duration(duration)
    
    clips = [bg_clip]
    
    # Titolo
    title_clip = create_text_clip(
        "Asset Strategico",
        80,
        WHITE,
        duration,
        ("center", 300),
        bold=True,
        start=0.3
    ).with_effects([vfx.CrossFadeIn(0.5)])
    clips.append(title_clip)
    
    # GROWVERSE
    gv_clip = create_text_clip(
        "GROWVERSE",
        100,
        GREEN,
        duration - 0.5,
        ("center", 420),
        bold=True,
        start=0.8
    ).with_effects([vfx.CrossFadeIn(0.8)])
    clips.append(gv_clip)
    
    # Copyright
    copy_clip = create_text_clip(
        "© 2024 GROWVERSE, LLC • Tecnologia Proprietaria",
        20,
        (100, 100, 100),
        duration - 1,
        ("center", 950),
        bold=False,
        start=1.5
    ).with_effects([vfx.CrossFadeIn(0.3)])
    clips.append(copy_clip)
    
    return CompositeVideoClip(clips, size=VIDEO_SIZE)

def main():
    print("🎬 Creazione video demo G-Press v2...")
    
    all_clips = []
    
    # Intro
    print("  → Intro...")
    intro = create_intro_clip(5)
    all_clips.append(intro)
    
    # Slide con screenshot
    for i, slide in enumerate(SLIDES):
        print(f"  → Slide {i+1}/{len(SLIDES)}: {slide['title']}...")
        clip = create_slide_clip(slide, 6)
        all_clips.append(clip)
    
    # Risparmio
    print("  → Slide risparmio...")
    savings = create_savings_clip(6)
    all_clips.append(savings)
    
    # Outro
    print("  → Outro...")
    outro = create_outro_clip(5)
    all_clips.append(outro)
    
    # Concatena con crossfade
    print("  → Concatenazione...")
    
    # Aggiungi crossfade tra clip
    for i, clip in enumerate(all_clips):
        if i > 0:
            all_clips[i] = clip.with_effects([vfx.CrossFadeIn(0.5)])
        if i < len(all_clips) - 1:
            all_clips[i] = all_clips[i].with_effects([vfx.CrossFadeOut(0.5)])
    
    final_video = concatenate_videoclips(all_clips, method="compose")
    
    # Aggiungi musica
    print("  → Aggiunta musica...")
    if os.path.exists(MUSIC_FILE):
        audio = AudioFileClip(MUSIC_FILE)
        # Taglia audio alla durata del video
        audio = audio.subclipped(0, final_video.duration)
        # Abbassa volume
        audio = audio.with_effects([afx.MultiplyVolume(0.3)])
        # Fade out finale
        audio = audio.with_effects([afx.AudioFadeOut(2)])
        final_video = final_video.with_audio(audio)
    
    # Esporta
    print(f"  → Esportazione in {OUTPUT_FILE}...")
    final_video.write_videofile(
        OUTPUT_FILE,
        fps=FPS,
        codec='libx264',
        audio_codec='aac',
        preset='medium',
        threads=4
    )
    
    print(f"✅ Video creato: {OUTPUT_FILE}")
    print(f"   Durata: {final_video.duration:.1f} secondi")

if __name__ == "__main__":
    main()
