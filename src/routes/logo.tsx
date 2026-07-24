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

  const downloadPng = (variant: 'black' | 'white' | 'primary-bg') => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logoAsset.url;

    img.onload = () => {
      canvas.width = 1024;
      canvas.height = 1024;

      // Draw background
      if (variant === 'primary-bg') {
        ctx.fillStyle = primaryColor;
      } else {
        ctx.fillStyle = variant === 'black' ? "#000000" : "#FFFFFF";
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create a temporary canvas for the tinted logo
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tCtx = tempCanvas.getContext('2d');
      if (!tCtx) return;

      const padding = canvas.width * 0.25;
      const size = canvas.width - (padding * 2);
      tCtx.drawImage(img, padding, padding, size, size);

      tCtx.globalCompositeOperation = 'source-in';
      
      // If primary background, symbol is black/white (let's go with black for contrast)
      // Otherwise, symbol is primary color
      if (variant === 'primary-bg') {
        tCtx.fillStyle = "#000000";
      } else {
        tCtx.fillStyle = primaryColor;
      }
      
      tCtx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(tempCanvas, 0, 0);

      const link = document.createElement("a");
      link.download = `dashcompass-logo-${variant}.png`;
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

