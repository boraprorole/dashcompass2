import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import logoAsset from "@/assets/dashcompass-logo.svg.asset.json";

export const Route = createFileRoute("/logo")({
  head: () => ({
    meta: [
      { title: "Logo - DashCompass" },
      { name: "description", content: "Baixar logo DashCompass" }
    ],
  }),
  component: LogoPage,
});

function LogoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [primaryColor, setPrimaryColor] = useState("#3DFC03");

  useEffect(() => {
    // Polling to get primary color from CSS variable because it might take a moment to load from DB
    const updateColor = () => {
      const root = document.documentElement;
      const color = getComputedStyle(root).getPropertyValue("--primary").trim();
      if (color && color.startsWith('#')) {
        setPrimaryColor(color);
      }
    };

    updateColor();
    const interval = setInterval(updateColor, 1000);
    return () => clearInterval(interval);
  }, []);

  const downloadPng = (variant: 'black' | 'white' | 'primary-bg', aspect: '1:1' | '16:9' = '1:1') => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logoAsset.url;

    img.onload = () => {
      if (aspect === '1:1') {
        canvas.width = 1024;
        canvas.height = 1024;
      } else {
        canvas.width = 1920;
        canvas.height = 1080;
      }

      // Draw background
      if (variant === 'primary-bg') {
        ctx.fillStyle = primaryColor;
      } else {
        ctx.fillStyle = variant === 'black' ? "#000000" : "#FFFFFF";
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create a temporary canvas for the tinted logo symbol
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tCtx = tempCanvas.getContext('2d');
      if (!tCtx) return;

      if (aspect === '1:1') {
        const padding = canvas.width * 0.25;
        const size = canvas.width - (padding * 2);
        tCtx.drawImage(img, padding, padding, size, size);
      } else {
        // 16:9 with text
        const logoSize = canvas.height * 0.4;
        const spacing = 40;
        
        // Calculate total width of logo + spacing + text
        tCtx.font = "bold 120px Inter, sans-serif";
        const textMetrics = tCtx.measureText("DashCompass");
        const totalWidth = logoSize + spacing + textMetrics.width;
        
        const startX = (canvas.width - totalWidth) / 2;
        const startY = (canvas.height - logoSize) / 2;
        
        // Draw logo
        tCtx.drawImage(img, startX, startY, logoSize, logoSize);
        
        // Draw text
        tCtx.fillStyle = "white"; // Temporarily white for source-in
        tCtx.textBaseline = "middle";
        tCtx.fillText("DashCompass", startX + logoSize + spacing, canvas.height / 2);
      }

      tCtx.globalCompositeOperation = 'source-in';
      
      if (variant === 'primary-bg') {
        tCtx.fillStyle = "#000000";
      } else if (variant === 'white') {
        tCtx.fillStyle = primaryColor;
      } else {
        tCtx.fillStyle = primaryColor;
      }
      
      tCtx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tempCanvas, 0, 0);

      const link = document.createElement("a");
      link.download = `dashcompass-logo-${variant}-${aspect.replace(':', '-')}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Logo baixado com sucesso!");
    };
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 md:p-8">
      <div className="w-full max-w-5xl space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">Brand Assets</h1>
          <p className="text-muted-foreground">Identidade visual DashCompass com as cores definidas no Admin.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Black Background Variant */}
          <div className="glass-strong flex flex-col items-center space-y-6 rounded-none p-6 transition-transform hover:scale-[1.02]">
            <div className="flex aspect-square w-full items-center justify-center bg-black">
              <div 
                className="h-1/2 w-1/2" 
                style={{ 
                  backgroundColor: primaryColor,
                  WebkitMaskImage: `url(${logoAsset.url})`,
                  maskImage: `url(${logoAsset.url})`,
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain'
                }}
              />
            </div>
            <div className="w-full space-y-3">
              <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">Símbolo Color / Fundo Preto</h3>
              <Button 
                onClick={() => downloadPng('black')} 
                className="w-full gap-2 rounded-none bg-white text-black hover:bg-white/90"
              >
                <Download className="h-4 w-4" /> Baixar PNG
              </Button>
            </div>
          </div>

          {/* White Background Variant */}
          <div className="glass-strong flex flex-col items-center space-y-6 rounded-none p-6 transition-transform hover:scale-[1.02]">
            <div className="flex aspect-square w-full items-center justify-center bg-white">
              <div 
                className="h-1/2 w-1/2" 
                style={{ 
                  backgroundColor: primaryColor,
                  WebkitMaskImage: `url(${logoAsset.url})`,
                  maskImage: `url(${logoAsset.url})`,
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain'
                }}
              />
            </div>
            <div className="w-full space-y-3">
              <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">Símbolo Color / Fundo Branco</h3>
              <Button 
                onClick={() => downloadPng('white')} 
                className="w-full gap-2 rounded-none bg-white text-black hover:bg-white/90"
              >
                <Download className="h-4 w-4" /> Baixar PNG
              </Button>
            </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white text-center">Versões 16:9 (Símbolo + Texto)</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* 16:9 Black */}
            <div className="glass-strong flex flex-col items-center space-y-6 rounded-none p-6 transition-transform hover:scale-[1.02]">
              <div className="flex aspect-video w-full items-center justify-center bg-black p-8">
                <div className="flex items-center gap-4">
                  <div 
                    className="h-12 w-12" 
                    style={{ 
                      backgroundColor: primaryColor,
                      WebkitMaskImage: `url(${logoAsset.url})`,
                      maskImage: `url(${logoAsset.url})`,
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                      WebkitMaskSize: 'contain',
                      maskSize: 'contain'
                    }}
                  />
                  <span className="text-2xl font-bold" style={{ color: primaryColor }}>DashCompass</span>
                </div>
              </div>
              <div className="w-full space-y-3">
                <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">Horizontal / Fundo Preto</h3>
                <Button 
                  onClick={() => downloadPng('black', '16:9')} 
                  className="w-full gap-2 rounded-none bg-white text-black hover:bg-white/90"
                >
                  <Download className="h-4 w-4" /> Baixar PNG
                </Button>
              </div>
            </div>

            {/* 16:9 White */}
            <div className="glass-strong flex flex-col items-center space-y-6 rounded-none p-6 transition-transform hover:scale-[1.02]">
              <div className="flex aspect-video w-full items-center justify-center bg-white p-8">
                <div className="flex items-center gap-4">
                  <div 
                    className="h-12 w-12" 
                    style={{ 
                      backgroundColor: primaryColor,
                      WebkitMaskImage: `url(${logoAsset.url})`,
                      maskImage: `url(${logoAsset.url})`,
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                      WebkitMaskSize: 'contain',
                      maskSize: 'contain'
                    }}
                  />
                  <span className="text-2xl font-bold" style={{ color: primaryColor }}>DashCompass</span>
                </div>
              </div>
              <div className="w-full space-y-3">
                <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">Horizontal / Fundo Branco</h3>
                <Button 
                  onClick={() => downloadPng('white', '16:9')} 
                  className="w-full gap-2 rounded-none bg-white text-black hover:bg-white/90"
                >
                  <Download className="h-4 w-4" /> Baixar PNG
                </Button>
              </div>
            </div>

            {/* 16:9 Primary */}
            <div className="glass-strong flex flex-col items-center space-y-6 rounded-none p-6 transition-transform hover:scale-[1.02] sm:col-span-2 lg:col-span-1">
              <div 
                className="flex aspect-video w-full items-center justify-center p-8"
                style={{ backgroundColor: primaryColor }}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="h-12 w-12 bg-black" 
                    style={{ 
                      WebkitMaskImage: `url(${logoAsset.url})`,
                      maskImage: `url(${logoAsset.url})`,
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                      WebkitMaskSize: 'contain',
                      maskSize: 'contain'
                    }}
                  />
                  <span className="text-2xl font-bold text-black">DashCompass</span>
                </div>
              </div>
              <div className="w-full space-y-3">
                <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">Horizontal / Fundo Admin</h3>
                <Button 
                  onClick={() => downloadPng('primary-bg', '16:9')} 
                  className="w-full gap-2 rounded-none bg-white text-black hover:bg-white/90"
                >
                  <Download className="h-4 w-4" /> Baixar PNG
                </Button>
              </div>
            </div>
          </div>

          {/* Primary Background Variant */}
          <div className="glass-strong flex flex-col items-center space-y-6 rounded-none p-6 transition-transform hover:scale-[1.02] sm:col-span-2 lg:col-span-1">
            <div 
              className="flex aspect-square w-full items-center justify-center"
              style={{ backgroundColor: primaryColor }}
            >
              <div 
                className="h-1/2 w-1/2 bg-black" 
                style={{ 
                  WebkitMaskImage: `url(${logoAsset.url})`,
                  maskImage: `url(${logoAsset.url})`,
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain'
                }}
              />
            </div>
            <div className="w-full space-y-3">
              <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">Símbolo Preto / Fundo Admin</h3>
              <Button 
                onClick={() => downloadPng('primary-bg')} 
                className="w-full gap-2 rounded-none bg-white text-black hover:bg-white/90"
              >
                <Download className="h-4 w-4" /> Baixar PNG
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-8">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-white"
            onClick={() => window.history.back()}
          >
            Voltar
          </Button>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

