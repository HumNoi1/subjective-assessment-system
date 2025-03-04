/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
      // ไม่รวม sharp เข้ามาในการบิลด์
      if (isServer) {
        config.externals = [...config.externals, 'sharp', '@xenova/transformers'];
      }
      
      // แก้ไขปัญหาเกี่ยวกับ binary modules
      config.resolve.alias = {
        ...config.resolve.alias,
        sharp$: false,
        'llamaindex/legacy': 'llamaindex/dist',
      };
      
      return config;
    },
    experimental: {
      // ใช้สำหรับแก้ปัญหาเกี่ยวกับ importation ของโมดูลที่ใช้ Node.js APIs
      serverComponentsExternalPackages: ['llamaindex', '@xenova/transformers'],
    },
  };
  
  export default nextConfig;