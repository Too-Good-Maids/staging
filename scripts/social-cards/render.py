"""Render 1200×630 social cards with Pillow. Run from any directory on macOS.
Uses site-owned imagery/typefaces and macOS Arial for small supporting text.
"""
from pathlib import Path
import json,sys
from PIL import Image,ImageDraw,ImageFont,ImageOps
ROOT=Path(__file__).resolve().parents[2]
data=json.loads((Path(__file__).parent/'cards.json').read_text());c=data['brand']
def font(path,size):return ImageFont.truetype(str(path),size)
sans='/System/Library/Fonts/Supplemental/Arial.ttf'
def wrap(text,f,width,draw):
 lines=[];line=''
 for word in text.split():
  test=(line+' '+word).strip()
  if draw.textlength(test,font=f)>width and line:lines.append(line);line=word
  else:line=test
 if line:lines.append(line)
 return lines
for card in data['cards']:
 im=Image.new('RGB',(1200,630),c['bg']);d=ImageDraw.Draw(im)
 d.rectangle((0,0,1200,13),fill=c['accent'])
 d.text((56,48),c['brand'],font=font(ROOT/c['font'],34),fill=c['ink'])
 d.text((58,102),c['sub'],font=font(sans,20),fill=c['ink'])
 headline=font(ROOT/c['font'],72 if c['brand']!='Too Good Maids' else 62)
 lines=wrap(card['headline'],headline,670,d)
 if len(lines)>3:raise ValueError(card['key'])
 for i,line in enumerate(lines):d.text((54,195+i*85),line,font=headline,fill=c['ink'])
 sub=font(sans,25)
 for i,line in enumerate(wrap(card['subhead'],sub,650,d)):d.text((58,465+i*33),line,font=sub,fill=c['ink'])
 # Contain photos so faces, animals and evidence are never cropped away.
 x,y,w,h=780,171,365,355
 d.rounded_rectangle((x,y,x+w,y+h),radius=24,fill=c['accent'])
 asset=Image.open(ROOT/(card['photo'] or c['logo'])).convert('RGBA');asset=ImageOps.contain(asset,(w-24,h-24))
 base=Image.new('RGBA',asset.size,'white');base.alpha_composite(asset)
 im.paste(base.convert('RGB'),(x+(w-asset.width)//2,y+(h-asset.height)//2))
 d.line((58,554,1142,554),fill=c['ink'],width=1)
 d.text((58,579),c['domain'],font=font(sans,20),fill=c['ink'])
 d.text((945,579),'EXPLORE THE SITE',font=font(sans,17),fill=c['ink'])
 path=ROOT/card['image'].lstrip('/');path.parent.mkdir(parents=True,exist_ok=True)
 im.save(path,quality=93,optimize=True)
print('Rendered',len(data['cards']),'cards')
