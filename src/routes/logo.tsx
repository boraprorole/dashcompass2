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
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [primaryColor, setPrimaryColor] = useState("#3DFC03");

  useEffect(() => {
    // Get primary color from CSS variable
    const root = document.documentElement;
    const color = getComputedStyle(root).getPropertyValue("--primary").trim();
    if (color) setPrimaryColor(color);
  }, []);

  const downloadPng = (variant: 'black' | 'white') => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logoAsset.url;

    img.onload = () => {
      // Set canvas size (e.g., 512x512 for a high-quality logo)
      canvas.width = 512;
      canvas.height = 512;

      // Draw background (square, no rounded borders)
      ctx.fillStyle = variant === 'black' ? "#000000" : "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // We need to draw the SVG with the primary color
      // Since it's a mask-based SVG usually, we'll draw it and then tint it
      
      // Create a temporary canvas for the tinted logo
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tCtx = tempCanvas.getContext('2d');
      if (!tCtx) return;

      // Draw original image scaled to fit with padding
      const padding = canvas.width * 0.2;
      const size = canvas.width - (padding * 2);
      tCtx.drawImage(img, padding, padding, size, size);

      // Tint with primary color
      tCtx.globalCompositeOperation = 'source-in';
      tCtx.fillStyle = primaryColor;
      tCtx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the tinted logo onto the main canvas
      ctx.drawImage(tempCanvas, 0, 0);

      // Trigger download
      const link = document.createElement("a");
      link.download = `dashcompass-logo-${variant}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success(`Logo (${variant}) baixado com sucesso!`);
    };
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 md:p-8">
      <div className="w-full max-w-4xl space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">Brand Assets</h1>
          <p className="text-muted-foreground">Logotipo DashCompass em alta resolução.</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Black Background Variant */}
          <div className="glass-strong flex flex-col items-center space-y-6 rounded-none p-8 transition-transform hover:scale-[1.02]">
            <div 
              className="flex h-64 w-64 items-center justify-center bg-black"
              style={{ boxShadow: '0 0 40px rgba(0,0,0,0.5)' }}
            >
              <div 
                className="h-32 w-32 bg-primary" 
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
              <h3 className="text-center text-lg font-semibold">Fundo Preto</h3>
              <Button 
                onClick={() => downloadPng('black')} 
                className="w-full gap-2 rounded-none bg-white text-black hover:bg-white/90"
              >
                <Download className="h-4 w-4" /> Baixar PNG
              </Button>
            </div>
          </div>

          {/* White Background Variant */}
          <div className="glass-strong flex flex-col items-center space-y-6 rounded-none p-8 transition-transform hover:scale-[1.02]">
            <div 
              className="flex h-64 w-64 items-center justify-center bg-white"
              style={{ boxShadow: '0 0 40px rgba(255,255,255,0.1)' }}
            >
              <div 
                className="h-32 w-32 bg-primary" 
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
              <h3 className="text-center text-lg font-semibold text-white">Fundo Branco</h3>
              <Button 
                onClick={() => downloadPng('white')} 
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
            onClick={() => {
              window.history.back();
            }}
          >
            Voltar
          </Button>
        </div>
      </div>

      {/* Hidden canvas for generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
