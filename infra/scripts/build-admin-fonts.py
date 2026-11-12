"""TIP824 build-only tool. Run in an external venv: fonttools==4.68.0 Brotli==1.2.1.

No application dependency, runtime download or database access. Sources are pinned to
google/fonts. Re-run after changing target catalogs; the receipt describes actual cmaps.
"""
import argparse
import hashlib
import json
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

import brotli
import fontTools
from fontTools import subset
from fontTools.merge import Merger
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

COMMIT = "5bb28733cec313b63fbd415b574b5ae35c8aa8b8"
SOURCES = {
    "NotoSans": ("NotoSans[wdth,wght].ttf", "latin"),
    "NotoSansSC": ("NotoSansSC[wght].ttf", "zh"),
    "NotoSansThai": ("NotoSansThai[wdth,wght].ttf", "th"),
    "NotoSansKhmer": ("NotoSansKhmer[wdth,wght].ttf", "km"),
    "NotoSansLao": ("NotoSansLao[wdth,wght].ttf", "lo"),
    "NotoSansMyanmar": ("NotoSansMyanmar[wdth,wght].ttf", "my"),
}
BLOCKS = {
    "latin": [(0x20, 0x24F), (0x300, 0x36F), (0x1E00, 0x1EFF), (0x2000, 0x27FF)],
    "th": [(0xE00, 0xE7F)],
    "km": [(0x1780, 0x17FF), (0x19E0, 0x19FF)],
    "lo": [(0xE80, 0xEFF)],
    "my": [(0x1000, 0x109F), (0xAA60, 0xAA7F), (0xA9E0, 0xA9FF)],
    "zh": [(0x3000, 0x303F), (0xFF00, 0xFFEF)],
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def ranges(points):
    result = []
    start = previous = None
    for point in sorted(points):
        if previous is not None and point != previous + 1:
            result.append(f"{start:X}-{previous:X}")
            start = None
        if start is None:
            start = point
        previous = point
    if start is not None:
        result.append(f"{start:X}-{previous:X}")
    return ",".join(result)


def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from strings(item)
    elif isinstance(value, list):
        for item in value:
            yield from strings(item)


def make_subset(font, points):
    options = subset.Options()
    options.layout_features = ["*"]  # Preserve contextual shaping, GSUB/GPOS and marks.
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.recalc_timestamp = False
    options.hinting = False  # Do not merge incompatible TrueType hinting programs across families.
    tool = subset.Subsetter(options=options)
    tool.populate(unicodes=points)
    tool.subset(font)
    return font


def regular(path):
    cached = path.with_name(f"{path.stem}-regular-4.68.0-{digest(path.read_bytes())[:12]}.ttf")
    if cached.exists():
        return TTFont(cached, recalcTimestamp=False)
    font = TTFont(path, recalcTimestamp=False)
    axes = {axis.axisTag: axis.defaultValue for axis in font["fvar"].axes}
    axes["wght"] = 400
    if "wdth" in axes:
        axes["wdth"] = 100
    font = instantiateVariableFont(font, axes, inplace=True)
    font.recalcTimestamp = False
    font.save(cached)
    return font


def rename(font, family, copyrights):
    values = {0: "\n".join(copyrights), 1: family, 2: "Regular", 4: family + " Regular",
              6: family.replace(" ", "") + "-Regular", 16: family, 17: "Regular"}
    for name_id, value in values.items():
        for platform, encoding, language in [(3, 1, 0x409), (1, 0, 0)]:
            font["name"].setName(value, name_id, platform, encoding, language)


def merged(parts, family, copyrights, temporary):
    hhea = {key: getattr(parts[0]["hhea"], key) for key in ["ascent", "descent", "lineGap"]}
    os2 = {key: getattr(parts[0]["OS/2"], key) for key in
           ["sTypoAscender", "sTypoDescender", "sTypoLineGap", "usWinAscent", "usWinDescent"]}
    paths = []
    for index, font in enumerate(parts):
        # These are horizontal UI subsets; vertical CJK tables cannot merge with
        # fonts without vertical metrics. STAT has no axes after static instancing.
        for tag in ["vhea", "vmtx", "BASE", "STAT"]:
            if tag in font:
                del font[tag]
        path = temporary / f"{family.replace(' ', '')}-{index}.ttf"
        font.save(path)
        paths.append(str(path))
    font = Merger().merge(paths)
    if family == "OPCHUB Latin":
        # Extra arrow/checkmark glyphs must not enlarge the Latin UI's line boxes.
        for key, value in hhea.items():
            setattr(font["hhea"], key, value)
        for key, value in os2.items():
            setattr(font["OS/2"], key, value)
    rename(font, family, copyrights)
    return font


def build(root, cache):
    assert fontTools.__version__ == "4.68.0" and brotli.__version__ == "1.2.1", "Use pinned build tools"
    output = root / "apps/admin/public/fonts"
    output.mkdir(parents=True, exist_ok=True)
    cache.mkdir(parents=True, exist_ok=True)
    seed = json.loads((root / "packages/shared/src/fixtures/prototype-seed.json").read_text("utf-8"))
    menu = {ord(c) for row in seed["LANGS"] for key in ["native", "country"] for c in row[key]}
    source_rows, fonts, copyrights = {}, {}, {}
    for family, (filename, language) in SOURCES.items():
        base = f"https://raw.githubusercontent.com/google/fonts/{COMMIT}/ofl/{family.lower()}/"
        urls = {"font": base + urllib.parse.quote(filename), "license": base + "OFL.txt"}
        font_path = cache / f"{family}.ttf"
        license_path = cache / f"{family}-OFL.txt"
        for path, url in [(font_path, urls["font"]), (license_path, urls["license"])]:
            if not path.exists():
                urllib.request.urlretrieve(url, path)
        license_bytes = license_path.read_bytes()
        assert b"SIL OPEN FONT LICENSE Version 1.1" in license_bytes
        (output / f"OFL-{family}.txt").write_bytes(license_bytes)
        copyrights[family] = license_bytes.decode("utf-8").splitlines()[0]
        source_rows[family] = {"fontUrl": urls["font"], "licenseUrl": urls["license"],
                               "sourceSha256": digest(font_path.read_bytes()),
                               "licenseSha256": digest(license_bytes)}
        points = {c for low, high in BLOCKS[language] for c in range(low, high + 1)}
        if language == "zh":
            # GB2312's common repertoire plus every actual Chinese catalog glyph.
            for first in range(0xA1, 0xF8):
                for second in range(0xA1, 0xFF):
                    try:
                        points.update(map(ord, bytes([first, second]).decode("gb2312")))
                    except UnicodeDecodeError:
                        pass  # Unassigned byte pairs are not glyphs.
        catalog = root / "apps/admin/messages" / ("vi" if language == "latin" else language)
        for path in catalog.rglob("*.json"):
            points.update(ord(c) for text in strings(json.loads(path.read_text("utf-8"))) for c in text)
        source = regular(font_path)
        points.update(menu & set(source.getBestCmap()))
        fonts[family] = make_subset(source, points)

    with tempfile.TemporaryDirectory(prefix="tip824-font-merge-") as temp:
        temporary = Path(temp)
        # Noto Sans lacks arrows/checkmarks. Add only those glyphs from licensed SC,
        # not a full Chinese font or a dependence on a developer's system fonts.
        latin = fonts["NotoSans"]
        symbols = regular(cache / "NotoSansSC.ttf")
        symbols = make_subset(symbols, set(range(0x2000, 0x2800)) - set(latin.getBestCmap()))
        fonts["NotoSans"] = merged([latin, symbols], "OPCHUB Latin",
                                   [copyrights["NotoSans"], copyrights["NotoSansSC"]], temporary)
        menu_parts, covered = [], set()
        for family in SOURCES:
            part = regular(cache / f"{family}.ttf")
            selected = (menu - covered) & set(part.getBestCmap())
            covered.update(selected)
            if selected:
                menu_parts.append(make_subset(part, selected))
        assert menu <= covered, f"Menu glyphs missing: {ranges(menu - covered)}"
        fonts["LanguageMenu"] = merged(menu_parts, "OPCHUB Language Menu", list(copyrights.values()), temporary)

    assets = {}
    for family, font in fonts.items():
        font["head"].created = font["head"].modified = 2082844800  # Reproducible 1970 epoch.
        font.recalcTimestamp = False
        font.flavor = "woff2"
        path = output / f"{family}-Regular.woff2"
        font.save(path)
        actual = TTFont(path, recalcTimestamp=False)
        cmap = actual.getBestCmap()
        assert "GSUB" in actual or family == "NotoSans"
        assets[family] = {"bytes": path.stat().st_size, "sha256": digest(path.read_bytes()),
                          "cmap": ranges(cmap), "glyphs": len(cmap),
                          "tables": sorted(actual.keys())}
        print(f"{family}: {path.stat().st_size} bytes; {len(cmap)} cmap entries; SHA256 {assets[family]['sha256']}")
    receipt = {"upstreamCommit": COMMIT, "fonttools": fontTools.__version__, "brotli": brotli.__version__,
               "weight": 400, "sources": source_rows, "assets": assets}
    target = root / "apps/admin/src/i18n/font-assets.json"
    target.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, required=True, help="External upstream cache, never runtime")
    args = parser.parse_args()
    build(Path(__file__).resolve().parents[2], args.cache.resolve())
