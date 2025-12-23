#!/usr/bin/env python3
"""
G-Press Demo Video Generator
Crea un video demo animato con screenshot dell'app e testo animato
"""

from moviepy import *
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import os

# Configurazione
OUTPUT_FILE = "/home/ubuntu/g-press/G-PRESS_DEMO_VIDEO.mp4"
VIDEO_SIZE = (1920, 1080)
FPS = 30
DURATION_PER_SLIDE = 5  # secondi per slide

# Colori
BG_COLOR = (26, 26, 46)  # #1a1a2e
GREEN_ACCENT = (76, 175, 80)  # #4CAF50
WHITE = (255, 255, 255)
GRAY = (160, 160, 160)

# Screenshot e testi
SLIDES = [
    {
        "image": "/home/ubuntu/gpress-pitch-v2/assets/screen_home.jpg",
        "title": "G-Press",
        "subtitle": "Distribuzione Comunicati Stampa AI-Powered",
        "description": "9.177 giornalisti • Autopilota Intelligente • Invio con 1 tap"
    },
    {
        "image": "/home/ubuntu/gpress-pitch-v2/assets/screen_ai.jpg",
        "title": "AI Journalist",
        "subtitle": "Knowledge Base Intelligente",
        "description": "Carica documenti • L'AI impara il tuo stile • Genera articoli perfetti"
    },
    {
        "image": "/home/ubuntu/gpress-pitch-v2/assets/screen_scraping.jpg",
        "title": "Scraping Email",
        "subtitle": "Trova Giornalisti Automaticamente",
        "description": "Inserisci testata • Trova email pubbliche • 100% legale"
    },
    {
        "image": "/home/ubuntu/gpress-pitch-v2/assets/screen_stats.jpg",
        "title": "Statistiche Real-Time",
        "subtitle": "Analytics Email Avanzate",
        "description": "Inviate • Consegnate • Aperte • Cliccate • Bounce • Spam"
    },
    {
        "image": "/home/ubuntu/gpress-pitch-v2/assets/screen_history.jpg",
        "title": "Storico Invii",
        "subtitle": "Traccia Ogni Comunicato",
        "description": "Cronologia completa • Destinatari • Status • Engagement"
    }
]

def create_gradient_background(size, color1, color2):
    """Crea uno sfondo con gradiente"""
    img = Image.new('RGB', size, color1)
    draw = ImageDraw.Draw(img)
    
    for y in range(size[1]):
        r = int(color1[0] + (color2[0] - color1[0]) * y / size[1])
        g = int(color1[1] + (color2[1] - color1[1]) * y / size[1])
        b = int(color1[2] + (color2[2] - color1[2]) * y / size[1])
        draw.line([(0, y), (size[0], y)], fill=(r, g, b))
    
    return np.array(img)

def create_text_image(text, font_size, color, max_width=None):
    """Crea un'immagine con testo"""
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    # Calcola dimensioni testo
    dummy_img = Image.new('RGBA', (1, 1))
    draw = ImageDraw.Draw(dummy_img)
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Crea immagine con padding
    padding = 20
    img = Image.new('RGBA', (text_width + padding * 2, text_height + padding * 2), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.text((padding, padding), text, font=font, fill=color + (255,))
    
    return np.array(img)

def create_slide_clip(slide_data, duration):
    """Crea un clip per una singola slide"""
    
    # Sfondo gradiente
    bg = create_gradient_background(VIDEO_SIZE, BG_COLOR, (15, 33, 62))
    bg_clip = ImageClip(bg).with_duration(duration)
    
    # Carica e ridimensiona screenshot
    if os.path.exists(slide_data["image"]):
        phone_img = Image.open(slide_data["image"])
        # Ridimensiona mantenendo aspect ratio
        phone_height = 700
        aspect = phone_img.width / phone_img.height
        phone_width = int(phone_height * aspect)
        phone_img = phone_img.resize((phone_width, phone_height), Image.Resampling.LANCZOS)
        
        # Aggiungi bordo arrotondato simulato
        phone_array = np.array(phone_img)
        phone_clip = (ImageClip(phone_array)
                     .with_duration(duration)
                     .with_position((100, (VIDEO_SIZE[1] - phone_height) // 2)))
        
        # Effetto zoom lento
        phone_clip = phone_clip.resized(lambda t: 1 + 0.02 * t / duration)
    else:
        phone_clip = None
    
    # Testo titolo
    title_img = create_text_image(slide_data["title"], 72, GREEN_ACCENT)
    title_clip = (ImageClip(title_img)
                 .with_duration(duration)
                 .with_position((550, 200))
                 .with_effects([vfx.CrossFadeIn(0.5)]))
    
    # Testo sottotitolo
    subtitle_img = create_text_image(slide_data["subtitle"], 42, WHITE)
    subtitle_clip = (ImageClip(subtitle_img)
                    .with_duration(duration - 0.3)
                    .with_start(0.3)
                    .with_position((550, 320))
                    .with_effects([vfx.CrossFadeIn(0.5)]))
    
    # Testo descrizione
    desc_img = create_text_image(slide_data["description"], 28, GRAY)
    desc_clip = (ImageClip(desc_img)
                .with_duration(duration - 0.6)
                .with_start(0.6)
                .with_position((550, 420))
                .with_effects([vfx.CrossFadeIn(0.5)]))
    
    # Linea verde accent
    accent_line = Image.new('RGB', (400, 4), GREEN_ACCENT)
    accent_clip = (ImageClip(np.array(accent_line))
                  .with_duration(duration - 0.2)
                  .with_start(0.2)
                  .with_position((550, 290))
                  .with_effects([vfx.CrossFadeIn(0.3)]))
    
    # Componi tutti gli elementi
    clips = [bg_clip, title_clip, subtitle_clip, desc_clip, accent_clip]
    if phone_clip:
        clips.insert(1, phone_clip)
    
    return CompositeVideoClip(clips, size=VIDEO_SIZE)

def create_intro_clip(duration=4):
    """Crea clip introduttivo"""
    bg = create_gradient_background(VIDEO_SIZE, BG_COLOR, (15, 33, 62))
    bg_clip = ImageClip(bg).with_duration(duration)
    
    # Logo G-Press (testo grande)
    logo_img = create_text_image("G-Press", 120, GREEN_ACCENT)
    logo_clip = (ImageClip(logo_img)
                .with_duration(duration)
                .with_position("center")
                .with_effects([vfx.CrossFadeIn(1), vfx.CrossFadeOut(0.5)]))
    
    # Sottotitolo
    sub_img = create_text_image("Sistema Proprietario PR • GROWVERSE", 36, WHITE)
    sub_clip = (ImageClip(sub_img)
               .with_duration(duration - 1)
               .with_start(1)
               .with_position(("center", 600))
               .with_effects([vfx.CrossFadeIn(0.5)]))
    
    return CompositeVideoClip([bg_clip, logo_clip, sub_clip], size=VIDEO_SIZE)

def create_outro_clip(duration=4):
    """Crea clip finale"""
    bg = create_gradient_background(VIDEO_SIZE, BG_COLOR, (15, 33, 62))
    bg_clip = ImageClip(bg).with_duration(duration)
    
    # Messaggio finale
    msg_img = create_text_image("Asset Strategico GROWVERSE", 64, GREEN_ACCENT)
    msg_clip = (ImageClip(msg_img)
               .with_duration(duration)
               .with_position("center")
               .with_effects([vfx.CrossFadeIn(0.5)]))
    
    # Risparmio
    savings_img = create_text_image("Risparmio: €21.840 - €30.240/anno", 42, WHITE)
    savings_clip = (ImageClip(savings_img)
                   .with_duration(duration - 0.5)
                   .with_start(0.5)
                   .with_position(("center", 580))
                   .with_effects([vfx.CrossFadeIn(0.5)]))
    
    # Copyright
    copy_img = create_text_image("© 2024 GROWVERSE, LLC", 24, GRAY)
    copy_clip = (ImageClip(copy_img)
                .with_duration(duration - 1)
                .with_start(1)
                .with_position(("center", 700))
                .with_effects([vfx.CrossFadeIn(0.3)]))
    
    return CompositeVideoClip([bg_clip, msg_clip, savings_clip, copy_clip], size=VIDEO_SIZE)

def main():
    print("🎬 Creazione video demo G-Press...")
    
    # Crea tutti i clip
    clips = []
    
    # Intro
    print("  → Creazione intro...")
    intro = create_intro_clip(4)
    clips.append(intro)
    
    # Slide con screenshot
    for i, slide in enumerate(SLIDES):
        print(f"  → Creazione slide {i+1}/{len(SLIDES)}: {slide['title']}...")
        clip = create_slide_clip(slide, DURATION_PER_SLIDE)
        # Aggiungi transizione
        clip = clip.with_effects([vfx.CrossFadeIn(0.5), vfx.CrossFadeOut(0.5)])
        clips.append(clip)
    
    # Outro
    print("  → Creazione outro...")
    outro = create_outro_clip(4)
    clips.append(outro)
    
    # Concatena tutti i clip
    print("  → Concatenazione clip...")
    final_video = concatenate_videoclips(clips, method="compose")
    
    # Esporta video
    print(f"  → Esportazione video in {OUTPUT_FILE}...")
    final_video.write_videofile(
        OUTPUT_FILE,
        fps=FPS,
        codec='libx264',
        audio=False,
        preset='medium',
        threads=4
    )
    
    print(f"✅ Video creato: {OUTPUT_FILE}")
    print(f"   Durata: {final_video.duration:.1f} secondi")

if __name__ == "__main__":
    main()
