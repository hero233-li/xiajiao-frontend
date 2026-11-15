"""把 public/ai-practical 下的 docx/xlsx/zip 重写成可复现字节，避免每次重新生成产生大量 git 变更。

顺序很重要：先规范化 docx/xlsx（去掉容器时间戳与 docProps 时间），再用规范化后的文件重建每个题号的 zip。
"""
import os
import re
import zipfile

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'ai-practical')
FIXED = (2026, 1, 1, 0, 0, 0)
STAMP = '2026-01-01T00:00:00Z'


def scrub_core(data: bytes) -> bytes:
    text = data.decode('utf-8')
    for tag in ('dcterms:created', 'dcterms:modified'):
        text = re.sub(r'(<%s[^>]*>)[^<]*(</%s>)' % (tag, tag), r'\g<1>' + STAMP + r'\g<2>', text)
    return text.encode('utf-8')


def rewrite_zip(target, parts):
    tmp = target + '.tmp'
    with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as dst:
        for name, data in sorted(parts, key=lambda p: p[0]):
            info = zipfile.ZipInfo(name, date_time=FIXED)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            dst.writestr(info, data)
    os.replace(tmp, target)


def normalize_container(path):
    with zipfile.ZipFile(path) as src:
        parts = []
        for info in src.infolist():
            data = src.read(info.filename)
            if info.filename == 'docProps/core.xml':
                data = scrub_core(data)
            parts.append((info.filename, data))
    rewrite_zip(path, parts)


def main():
    codes = sorted(d for d in os.listdir(ROOT) if os.path.isdir(os.path.join(ROOT, d)))
    containers = 0
    for code in codes:
        d = os.path.join(ROOT, code)
        for f in sorted(os.listdir(d)):
            if f.endswith(('.docx', '.xlsx')):
                normalize_container(os.path.join(d, f))
                containers += 1
        parts = [(f, open(os.path.join(d, f), 'rb').read()) for f in sorted(os.listdir(d))]
        rewrite_zip(os.path.join(ROOT, code + '.zip'), parts)
    print('normalized containers', containers, 'zips', len(codes))


if __name__ == '__main__':
    main()
