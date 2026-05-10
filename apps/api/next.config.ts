import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@plawcess/database"],
  // pdf-parse / pdfjs-dist는 worker module을 런타임에 동적으로 require하기 때문에
  // Next.js가 번들에 포함시키면 worker 경로가 깨진다. external로 두어 node_modules에서 직접 resolve.
  // officeparser(PPTX/DOCX 백업 파서)도 native subprocess(libreoffice 등)를 호출할 수 있어 함께 external.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "officeparser", "mammoth"],
};

export default nextConfig;
