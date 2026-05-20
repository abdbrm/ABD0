# Cyrillic Font for PDF Reports

Run this once inside the server/fonts/ folder:

curl -L "https://github.com/dejavu-fonts/dejavu-fonts/releases/download/version_2_37/dejavu-fonts-ttf-2.37.tar.bz2" -o fonts.tar.bz2
tar xjf fonts.tar.bz2
cp dejavu-fonts-ttf-2.37/ttf/DejaVuSans.ttf ./
cp dejavu-fonts-ttf-2.37/ttf/DejaVuSans-Bold.ttf ./
rm -rf fonts.tar.bz2 dejavu-fonts-ttf-2.37
