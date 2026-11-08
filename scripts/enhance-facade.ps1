$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# Only independent per-pixel color operations. No resampling, geometry,
# sharpening, denoising, reconstruction, removal or content generation.
if (-not ('FacadeColorGrade' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
public static class FacadeColorGrade {
    static double Bound(double value) { return Math.Max(0, Math.Min(1, value)); }
    public static void Apply(byte[] pixels, int width, int height, int stride,
                             double gamma, double shadows, double contrast, double saturation) {
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int p = y * stride + x * 4;
                double b = pixels[p] / 255.0;
                double g = pixels[p + 1] / 255.0;
                double r = pixels[p + 2] / 255.0;
                double luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                double lift = shadows * Math.Pow(1 - luminance, 2);
                r = Math.Pow(Bound(r + lift * (1 - r)), 1 / gamma);
                g = Math.Pow(Bound(g + lift * (1 - g)), 1 / gamma);
                b = Math.Pow(Bound(b + lift * (1 - b)), 1 / gamma);
                luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                r = (luminance + saturation * (r - luminance) - 0.5) * contrast + 0.5;
                g = (luminance + saturation * (g - luminance) - 0.5) * contrast + 0.5;
                b = (luminance + saturation * (b - luminance) - 0.5) * contrast + 0.5;
                pixels[p] = (byte)Math.Round(Bound(b) * 255);
                pixels[p + 1] = (byte)Math.Round(Bound(g) * 255);
                pixels[p + 2] = (byte)Math.Round(Bound(r) * 255);
                // Alpha and the exact pixel location are preserved.
            }
        }
    }
}
'@
}

$projectDirectory = Split-Path -Parent $PSScriptRoot
$outputDirectory = Join-Path $projectDirectory 'output/imagens'
$originalDirectory = Join-Path $outputDirectory 'originais'
New-Item -ItemType Directory -Path $outputDirectory, $originalDirectory -Force | Out-Null

$photos = @(
    @{ Source = 'C:/Users/Usuario/AppData/Local/Temp/codex-clipboard-1ae92b32-3e57-4f1b-ade9-8d20e47c148e.png'; Name = 'fachada-frontal'; Gamma = 1.06; Shadows = 0.01; Contrast = 1.035; Saturation = 1.025 },
    @{ Source = 'C:/Users/Usuario/AppData/Local/Temp/codex-clipboard-ac38f988-87a4-4c16-8a58-abca1e903329.png'; Name = 'fachada-ampla'; Gamma = 1.15; Shadows = 0.025; Contrast = 1.035; Saturation = 1.05 }
)

foreach ($photo in $photos) {
    $originalPath = Join-Path $originalDirectory ($photo.Name + '-original.png')
    if (-not (Test-Path -LiteralPath $originalPath)) {
        Copy-Item -LiteralPath $photo.Source -Destination $originalPath
    }
    $sourceBitmap = [System.Drawing.Bitmap]::new($originalPath)
    $rectangle = [System.Drawing.Rectangle]::new(0, 0, $sourceBitmap.Width, $sourceBitmap.Height)
    $resultBitmap = $sourceBitmap.Clone($rectangle, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
        $lockedPixels = $resultBitmap.LockBits($rectangle, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try {
            if ($lockedPixels.Stride -le 0) { throw 'Formato de linhas não suportado; nenhuma edição foi salva.' }
            $bytes = [byte[]]::new($lockedPixels.Stride * $resultBitmap.Height)
            [System.Runtime.InteropServices.Marshal]::Copy($lockedPixels.Scan0, $bytes, 0, $bytes.Length)
            [FacadeColorGrade]::Apply($bytes, $resultBitmap.Width, $resultBitmap.Height, $lockedPixels.Stride, $photo.Gamma, $photo.Shadows, $photo.Contrast, $photo.Saturation)
            [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $lockedPixels.Scan0, $bytes.Length)
        } finally { $resultBitmap.UnlockBits($lockedPixels) }
        $destination = Join-Path $outputDirectory ($photo.Name + '-tratada.png')
        if (Test-Path -LiteralPath $destination) { throw "O arquivo já existe: $destination. Use outro nome para preservar a versão anterior." }
        $resultBitmap.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Output "$destination ($($resultBitmap.Width) x $($resultBitmap.Height))"
    } finally {
        $resultBitmap.Dispose()
        $sourceBitmap.Dispose()
    }
}
