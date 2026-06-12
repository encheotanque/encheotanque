process.env.TZ = "America/Sao_Paulo";

import express from "express";
import mysql from "mysql2/promise";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import compression from "compression";
import { exec } from "child_process";
import { promisify } from "util";
import cron from "node-cron";
import { GoogleGenAI } from "@google/genai";
import { runAnpTancagemSync } from "./app/applet/sync_tancagem.js";

const execAsync = promisify(exec);

const _filename = typeof import.meta !== 'undefined' && import.meta.url 
  ? fileURLToPath(import.meta.url) 
  : __filename;
const _dirname = typeof __dirname !== 'undefined' 
  ? __dirname 
  : path.dirname(_filename);

if (_filename.endsWith("server.cjs") || _filename.includes("dist") || process.env.NODE_ENV === "production") {
  process.env.NODE_ENV = "production";
}

process.on("uncaughtException", (err) => {
  console.error("FATAL: Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("FATAL: Unhandled Rejection at:", promise, "reason:", reason);
});

dotenv.config();

async function startServer() {
  const app = express();
  app.use(compression());
  app.set("trust proxy", 1);
  // Determine the correct port to bind.
  // In development, the dev server must bind to port 3000.
  // In production (when NODE_ENV is "production"), we must ALWAYS respect the PORT environment variable if provided,
  // otherwise fallback to 3000.
  let PORT = 3000;
  if (process.env.NODE_ENV === "production" && process.env.PORT) {
    const parsedPort = parseInt(String(process.env.PORT).trim(), 10);
    if (!isNaN(parsedPort) && parsedPort > 0) {
      PORT = parsedPort;
    }
  }

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  // Disable caching for HTML, service worker, and manifest resources to ensure live client updates
  app.use((req, res, next) => {
    const urlPath = req.path;
    if (urlPath === '/sw.js') {
      res.setHeader('Service-Worker-Allowed', '/');
    }
    if (
      urlPath === '/sw.js' || 
      urlPath === '/manifest.json' || 
      urlPath.endsWith('.html') || 
      (!urlPath.includes('.') && !urlPath.startsWith('/api/'))
    ) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });
  
  // Serve static files from public directory explicitly
  app.use(express.static(path.join(process.cwd(), "public")));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString(), env: process.env.NODE_ENV });
  });

  // Explicit route for robots.txt to ensure indexing is allowed and accessible by search engines
  app.get("/robots.txt", (req, res) => {
    res.type("text/plain");
    res.send("User-agent: *\nAllow: /\n\nSitemap: https://www.encheotanque.net.br/sitemap.xml\n");
  });

  // Dynamic sitemap.xml endpoint for Google crawls and auto-discovery of key content/terms pages
  app.get("/sitemap.xml", (req, res) => {
    res.type("application/xml");
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.encheotanque.net.br/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://encheotanque.net.br/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://www.encheotanque.net.br/terms.html</loc>
    <lastmod>2026-05-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://www.encheotanque.net.br/privacy.html</loc>
    <lastmod>2026-05-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://www.encheotanque.net.br/doc.html</loc>
    <lastmod>2026-05-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://www.encheotanque.net.br/RELATORIO_PROJETO.html</loc>
    <lastmod>2026-05-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;
    res.send(sitemap);
  });

  const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const JWT_SECRET = process.env.JWT_SECRET || "enche-o-tanque-secret-2024";

  // Email transporter setup
  const transporter = nodemailer.createTransport({
    service: !process.env.SMTP_HOST ? 'gmail' : undefined,
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    connectionTimeout: 10000, 
    greetingTimeout: 10000,
    socketTimeout: 15000
  });

  // Helper for admin checks
  async function checkIsAdmin(email: string | null | undefined) {
    if (!email) return false;
    const admins = [
      "marcio.vasconcellos@gmail.com", 
      "afonsogwinter@gmail.com",
      "encheotanqueucp@gmail.com"
    ];
    if (admins.some(admin => email.toLowerCase() === admin.toLowerCase())) {
      return true;
    }
    try {
      const [rows] = await pool.execute(
        "SELECT 1 FROM tb_empresa_contato WHERE ds_email = ? AND fl_ativo = 1 AND tp_contato = 'A'",
        [email]
      );
      return (rows as any[]).length > 0;
    } catch (e) {
      console.error("[AUTH] Error checking admin in tb_empresa_contato:", e);
      return false;
    }
  }

  // Resolves the logged-in user's company enterprise ID, prioritizing their administrator status
  async function getCompanyIdForUser(email: string | null | undefined): Promise<number> {
    if (!email) return 1;
    try {
      // 1. Check if user is an administrator contact in tb_empresa_contato
      const [contacts]: any = await pool.execute(
        "SELECT id_empresa FROM tb_empresa_contato WHERE ds_email = ? AND fl_ativo = 1 AND tp_contato = 'A'",
        [email.toLowerCase().trim()]
      );
      if (contacts.length > 0) {
        return contacts[0].id_empresa;
      }
      
      // 2. Check if user is registered in tb_motorista
      const [drivers]: any = await pool.execute(
        "SELECT id_empresa FROM tb_motorista WHERE ds_email = ?",
        [email.toLowerCase().trim()]
      );
      if (drivers.length > 0) {
        return drivers[0].id_empresa;
      }
    } catch (err) {
      console.error("[getCompanyIdForUser] Error resolving company ID:", err);
    }
    return 1; // Default fallback to AVULSO
  }

  // Check SMTP connection on startup
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter.verify((error, success) => {
      if (error) {
        console.warn("[MAIL] SMTP Error:", error.message);
      } else {
        console.log("[MAIL] Server is ready to send emails");
      }
    });
  }

  async function sendVerificationEmail(email: string, name: string, verifyLink: string) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("[MAIL] SMTP credentials not set. Skipping real email.");
        return false;
    }

    const mailOptions = {
      from: `"Enche o Tanque" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Verifique seu e-mail - Enche o Tanque",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #f9f9f9;">
          <h2 style="color: #222;">Olá, ${name}!</h2>
          <p>Recebemos sua solicitação de cadastro no <strong>Enche o Tanque</strong>.</p>
          <p>Para prosseguir com a validação do seu perfil e liberação de acesso, por favor clique no botão abaixo para confirmar seu endereço de e-mail:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyLink}" style="background-color: #00ff00; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; text-transform: uppercase; font-size: 14px; display: inline-block;">Confirmar E-mail</a>
          </div>
          <p style="color: #666; font-size: 12px;">Se você não solicitou este cadastro, pode ignorar este e-mail.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 10px; color: #999;">Enche o Tanque - Verificação de Segurança</p>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`[MAIL] Verification email sent to ${email}`);
      return true;
    } catch (error) {
      console.error("[MAIL] Error sending email:", error);
      return false;
    }
  }

  async function sendApprovalEmail(email: string, name: string) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return false;

    const mailOptions = {
      from: `"Enche o Tanque" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Cadastro Aprovado! - Enche o Tanque",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #f9f9f9;">
          <h2 style="color: #222;">Boas notícias, ${name}!</h2>
          <p>Seu cadastro no <strong>Enche o Tanque</strong> foi aprovado.</p>
          <p>Você já pode acessar o sistema com seu e-mail e começar a capturar os dados dos abastecimentos.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL || `http://localhost:${PORT}`}" style="background-color: #00ff00; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; text-transform: uppercase; font-size: 14px; display: inline-block;">Acessar o App</a>
          </div>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 10px; color: #999;">Enche o Tanque - Verificação de Segurança</p>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`[MAIL] Approval email sent to ${email}`);
      return true;
    } catch (error) {
      console.error("[MAIL] Error sending approval email:", error);
      return false;
    }
  }

  async function sendFeedbackEmail(userEmail: string, message: string, userName: string = "Anônimo", userPhone: string = "Não informado") {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("[MAIL] SMTP credentials not set for feedback.");
      // In development without SMTP, we still want to log it
      console.log(`[FEEDBACK] From ${userName} (${userEmail}): ${message}`);
      return true; 
    }

    const mailOptions = {
      from: `"Enche o Tanque Feedback" <${process.env.SMTP_USER}>`,
      to: process.env.MARCIO_EMAIL || "marcio.vasconcellos@gmail.com",
      cc: process.env.GIOVANA_EMAIL || process.env.MARCIO_EMAIL || "marcio.vasconcellos@gmail.com", 
      replyTo: userEmail !== "Anônimo" ? userEmail : undefined,
      subject: `🚀 Feedback de ${userName}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 20px auto; padding: 40px; border: 1px solid #e0e0e0; border-radius: 20px; background-color: #ffffff; color: #333; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #000; text-transform: uppercase; font-style: italic; margin: 0; font-size: 24px;">NOVO <span style="color: #6bb900;">FEEDBACK</span></h2>
            <p style="color: #888; font-size: 14px; margin-top: 5px;">A comunidade está falando!</p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 25px; border-radius: 15px; margin-bottom: 30px; border-left: 4px solid #ccff00;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
                  <strong style="color: #6bb900; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 2px;">Motorista</strong>
                  <span style="font-weight: 700; font-size: 16px;">${userName}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
                  <strong style="color: #6bb900; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 2px;">E-mail</strong>
                  <span style="font-size: 14px;">${userEmail}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">
                  <strong style="color: #6bb900; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 2px;">Telefone</strong>
                  <span style="font-size: 14px;">${userPhone}</span>
                </td>
              </tr>
            </table>
          </div>

          <div style="padding: 25px; background: #fff; border: 1px dashed #ccc; border-radius: 15px; line-height: 1.6; color: #444; font-size: 16px;">
            <div style="color: #999; font-size: 24px; line-height: 0; margin-bottom: 10px;">&ldquo;</div>
            ${message.replace(/\n/g, '<br>')}
            <div style="color: #999; font-size: 24px; line-height: 0; margin-top: 10px; text-align: right;">&rdquo;</div>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f0f0f0; text-align: center;">
            <p style="font-size: 10px; color: #bbb; text-transform: uppercase; letter-spacing: 1px; margin: 0;">Enche o Tanque • Inteligência Coletiva</p>
          </div>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`[MAIL] Feedback email sent from ${userEmail}`);
      return true;
    } catch (error) {
      console.error("[MAIL] Error sending feedback email:", error);
      return false;
    }
  }

  async function sendContactEmail(senderEmail: string, message: string, senderName: string, senderPhone: string) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("[MAIL] SMTP credentials not set for contact.");
      console.log(`[CONTACT] To encheotanqueucp@gmail.com with BCC for admins. From ${senderName} (${senderEmail}): ${message}`);
      return true;
    }

    const adminEmails = [
      process.env.MARCIO_EMAIL || "marcio.vasconcellos@gmail.com",
      process.env.GIOVANA_EMAIL
    ].filter(Boolean) as string[];

    // Identify message type using Gemini API if key is set, and draft a tailored, empathetic, non-committal reply
    let aiParagraph = "Sua mensagem foi recebida com sucesso por nossa equipe de desenvolvimento! Vamos analisar com atenção cada detalhe do seu contato para continuarmos aprimorando nossa plataforma colaborativa.";
    let categoryTitle = "Mensagem Recebida";

    if (process.env.GEMINI_API_KEY) {
      try {
        const sysInstruction = `Você é o assistente virtual de inteligência de atendimento ao cliente do portal "Enche o Tanque" (uma plataforma colaborativa para economia de combustíveis).
Sua tarefa é analisar a mensagem recebida pelo Fale Conosco, categorizá-la, e escrever um parágrafo personalizado de confirmação de recebimento para o e-mail do usuário.

REGRAS IMPERATIVAS:
1. AGRADEÇA de forma simpática, prestativa, polida e amigável.
2. Contextualize a resposta de acordo com o teor da mensagem do usuário (exemplos: se o usuário pediu de novos postos ou cadastro de sua cidade, se reclamou de preço errado, se sugeriu algo novo no app, elogiou o sistema, etc.).
3. NUNCA faça promessas, garantias, prazos ou compromissos. Use expressões como: "nosso time irá avaliar suas considerações com carinho", "as informações foram encaminhadas para nossa análise de viabilidade técnica", "iremos averiguar o informado", etc.
4. Escreva em português brasileiro fluido e com gramática excelente.
5. Escreva apensa o parágrafo de conteúdo. NÃO inclua saudações (como "Olá, João") nem despedidas ou assinaturas ("Atenciosamente, Equipe Enche o Tanque"), pois o template do e-mail já cuida dessas frentes.
6. Limite-se a um parágrafo curto e objetivo (até 4-5 linhas).`;

        const promptText = `Informações do Contato:
Nome: ${senderName}
Email: ${senderEmail}
Mensagem Original:
"${message}"

Gere uma resposta estritamente em formato JSON:
{
  "categoria": "Elogio, Reclamação, Dúvida, Nova Cidade/Posto, Sugestão de Recursos, Relato de Erro ou Outro",
  "respostaPersonalizada": "parágrafo de corpo do e-mail de resposta de confirmação de recebimento sem promessa alguma"
}`;

        const aiResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptText,
          config: {
            systemInstruction: sysInstruction,
            responseMimeType: "application/json",
          }
        });

        const textResponse = aiResponse.text;
        if (textResponse) {
          const parsed = JSON.parse(textResponse.trim());
          if (parsed && parsed.respostaPersonalizada) {
            aiParagraph = parsed.respostaPersonalizada;
          }
          if (parsed && parsed.categoria) {
            categoryTitle = parsed.categoria;
          }
        }
      } catch (aiErr) {
        console.warn("[GEMINI_CONTACT] AI response generation failed, fallback applied:", aiErr);
      }
    }

    // 1. Send feedback form email to project email with BCC to administrators (with improved color contrast)
    const adminMailOptions = {
      from: `"Enche o Tanque - Fale Conosco" <${process.env.SMTP_USER}>`,
      to: "encheotanqueucp@gmail.com",
      bcc: adminEmails,
      replyTo: senderEmail,
      subject: `📬 Fale Conosco: [${categoryTitle}] de ${senderName}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 20px auto; padding: 40px; border: 1px solid #d1d5db; border-radius: 20px; background-color: #ffffff; color: #1f2937; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #111827; text-transform: uppercase; margin: 0; font-size: 24px; font-weight: 800;">CONTATO: <span style="color: #047857;">FALE CONOSCO</span></h2>
            <p style="color: #4b5563; font-size: 14px; margin-top: 5px; font-weight: 500;">Uma nova mensagem foi recebida no site!</p>
            <span style="display: inline-block; background-color: #f3f4f6; color: #374151; font-size: 11px; padding: 4px 10px; border-radius: 9999px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #e5e7eb;">${categoryTitle}</span>
          </div>
          
          <div style="background-color: #f9fafb; padding: 25px; border-radius: 15px; margin-bottom: 30px; border-left: 4px solid #059669; border: 1px solid #e5e7eb; border-left-width: 4px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                  <strong style="color: #374151; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 2px; font-weight: 700; letter-spacing: 0.5px;">Nome</strong>
                  <span style="font-weight: 700; font-size: 16px; color: #111827;">${senderName}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                  <strong style="color: #374151; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 2px; font-weight: 700; letter-spacing: 0.5px;">E-mail</strong>
                  <span style="font-size: 14px; color: #111827; font-weight: 600;">${senderEmail}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">
                  <strong style="color: #374151; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 2px; font-weight: 700; letter-spacing: 0.5px;">Telefone</strong>
                  <span style="font-size: 14px; color: #111827; font-weight: 600;">${senderPhone}</span>
                </td>
              </tr>
            </table>
          </div>

          <div style="padding: 25px; background: #ffffff; border: 1px dashed #9ca3af; border-radius: 15px; line-height: 1.6; color: #1f2937; font-size: 16px;">
            <div style="color: #9cb3af; font-size: 24px; line-height: 0; margin-bottom: 10px;">&ldquo;</div>
            ${message.replace(/\n/g, '<br>')}
            <div style="color: #9cb3af; font-size: 24px; line-height: 0; margin-top: 10px; text-align: right;">&rdquo;</div>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin: 0; font-weight: 600;">Enche o Tanque • Fale Conosco Site</p>
          </div>
        </div>
      `
    };

    // 2. Send confirmation to the contact sender (with high contrast and standard notification + specialized paragraph)
    const confirmationMailOptions = {
      from: `"Enche o Tanque" <${process.env.SMTP_USER}>`,
      to: senderEmail,
      bcc: "encheotanqueucp@gmail.com",
      subject: `Recebemos seu contato! - Enche o Tanque`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 20px auto; padding: 40px; border: 1px solid #d1d5db; border-radius: 20px; background-color: #ffffff; color: #1f2937; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #111827; margin: 0; font-size: 22px; font-weight: 800;">Olá, <span style="color: #047857;">${senderName}</span>!</h2>
            <p style="color: #4b5563; font-size: 14px; margin-top: 8px; font-weight: 500;">Agradecemos por entrar em contato conosco.</p>
          </div>
          
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #10b981; padding: 20px; border-radius: 12px; margin-bottom: 25px; font-size: 14px; line-height: 1.6; color: #14532d;">
            <strong>📬 Mensagem recebida com sucesso!</strong><br>
            Sua mensagem de assunto <strong>"${categoryTitle}"</strong> foi registrada de forma segura em nosso sistema. Nosso time de desenvolvimento já foi notificado!
          </div>

          <p style="font-size: 15px; line-height: 1.6; color: #1f2937; margin-bottom: 20px;">
            ${aiParagraph}
          </p>
          
          <p style="font-size: 13px; line-height: 1.6; color: #4b5563; margin-bottom: 25px;">
            Para seu controle e segurança, segue uma cópia dos detalhes que você informou no formulário:
          </p>

          <div style="background-color: #f9fafb; padding: 20px; border-radius: 12px; margin-bottom: 30px; font-size: 13px; border: 1px solid #e5e7eb; border-left: 4px solid #059669; color: #1f2937;">
            <p style="margin: 0 0 8px 0; color: #111827;"><strong style="color: #4b5563;">Nome:</strong> ${senderName}</p>
            <p style="margin: 0 0 8px 0; color: #111827;"><strong style="color: #4b5563;">Telefone:</strong> ${senderPhone}</p>
            <p style="margin: 0 0 8px 0; color: #111827;"><strong style="color: #4b5563;">E-mail:</strong> ${senderEmail}</p>
            <div style="margin: 12px 0 0 0; padding-top: 12px; border-top: 1px solid #e5e7eb; font-style: italic; color: #374151; background: #ffffff; padding: 10px; border-radius: 6px;">
               "${message.replace(/\n/g, '<br>')}"
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://encheotanque.app.br" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 13px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Visitar nosso Site</a>
          </div>

          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;">
          <div style="text-align: center;">
            <p style="font-size: 11px; color: #4b5563; margin: 0 0 5px 0; font-weight: 600;">Enche o Tanque • Inteligência Coletiva</p>
            <p style="font-size: 10px; color: #9ca3af; margin: 0;">Este é um e-mail automático de confirmação de recebimento.</p>
          </div>
        </div>
      `
    };

    try {
      await Promise.all([
        transporter.sendMail(adminMailOptions),
        transporter.sendMail(confirmationMailOptions)
      ]);
      console.log(`[MAIL] Contact email and confirmation sent successfully. Sender: ${senderEmail}`);
      return true;
    } catch (error) {
      console.error("[MAIL] Error sending contact or confirmation email:", error);
      return false;
    }
  }

  // Database connection pool
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "129.146.31.117",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "nRGboHgFC7PkD9",
    database: process.env.DB_NAME || "encheotanque",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    timezone: "-03:00",
  });

  // Log all requests
  app.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.url}`);
    next();
  });

  // Explicitly serve public HTML files to avoid Vite dev server or SPA fallback routing interception
  app.use((req, res, next) => {
    const urlPath = req.path;
    if (urlPath.endsWith(".html") && !urlPath.includes("..")) {
      const pathsToTry = [
        path.join(process.cwd(), "public", urlPath),
        path.join(process.cwd(), "dist", urlPath)
      ];
      for (const p of pathsToTry) {
        if (fs.existsSync(p)) {
          return res.sendFile(p);
        }
      }
    }
    next();
  });

  // Ensure database schema is up to date
  async function initDb() {
    try {
      // Create status table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS tb_status (
          id_status TINYINT PRIMARY KEY,
          ds_status VARCHAR(50) NOT NULL
        )
      `);

      // Seed status table
      const [statusRows]: any = await pool.execute("SELECT COUNT(*) as count FROM tb_status");
      if (statusRows[0].count === 0) {
        await pool.execute(`
          INSERT INTO tb_status (id_status, ds_status) VALUES 
          (1, 'PENDING_VERIFICATION'),
          (2, 'WAITING_APPROVAL'),
          (3, 'AUTHORIZED'),
          (4, 'SUSPENDED'),
          (0, 'REJECTED')
        `);
      }

      const columnsToAdd = [
        { name: 'id_status', type: 'TINYINT DEFAULT 1' },
        { name: 'fl_verificado', type: 'TINYINT(1) DEFAULT 0' },
        { name: 'dt_cadastro', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
        { name: 'ds_telefone', type: 'VARCHAR(20)' },
        { name: 'nu_mot_cpf', type: 'VARCHAR(150)' },
        { name: 'nu_mot_cnh', type: 'VARCHAR(150)' },
        { name: 'dt_mot_cnh_val', type: 'DATE' },
        { name: 'ds_foto', type: 'MEDIUMTEXT' },
        { name: 'ds_google_foto', type: 'MEDIUMTEXT' },
        { name: 'id_combustivel_pref', type: 'INT' },
        { name: 'nu_raio_busca_pref', type: 'INT DEFAULT 10' },
        { name: 'dt_contratacao', type: 'DATE' },
        { name: 'dt_ultimo_aso', type: 'DATE' },
        { name: 'nu_total_routes', type: 'INT DEFAULT 0' },
        { name: 'nu_total_km', type: 'INT DEFAULT 0' },
        { name: 'nu_recent_incidents', type: 'INT DEFAULT 0' },
        { name: 'ds_observations', type: 'TEXT' },
        { name: 'nu_performance', type: 'INT DEFAULT 90' },
        { name: 'ds_status_fleet', type: "VARCHAR(20) DEFAULT 'off'" }
      ];

      for (const col of columnsToAdd) {
        try {
          await pool.execute(`ALTER TABLE tb_motorista ADD COLUMN ${col.name} ${col.type}`);
          console.log(`[DB] Added column ${col.name}`);
        } catch (e: any) {
          if (!e.message.includes('Duplicate column name')) {
            console.warn(`[DB] Error adding column ${col.name}:`, e.message);
          }
        }
      }

      // Add columns to tb_abastecimentos
      const abastColsToAdd = [
        { name: 'nu_litros', type: 'DECIMAL(10,3)' },
        { name: 'vl_economia', type: 'DECIMAL(10,2)' }
      ];

      for (const col of abastColsToAdd) {
        try {
          await pool.execute(`ALTER TABLE tb_abastecimentos ADD COLUMN ${col.name} ${col.type}`);
          console.log(`[DB] Added column ${col.name} to tb_abastecimentos`);
        } catch (e: any) {
          if (!e.message.includes('Duplicate column name')) {
            console.warn(`[DB] Error adding column ${col.name} to tb_abastecimentos:`, e.message);
          }
        }
      }

      const vehicleColsToAdd = [
        { name: 'id_comb_pref', type: 'INT' },
        { name: 'ds_combs_permitidos', type: 'VARCHAR(255)' }
      ];

      for (const col of vehicleColsToAdd) {
        try {
          await pool.execute(`ALTER TABLE tb_veiculo ADD COLUMN ${col.name} ${col.type}`);
          console.log(`[DB] Added column ${col.name} to tb_veiculo`);
        } catch (e: any) {
          if (!e.message.includes('Duplicate column name')) {
            console.warn(`[DB] Error adding column ${col.name} to tb_veiculo:`, e.message);
          }
        }
      }

      // Add nm_municipio to tb_postos
      try {
        await pool.execute("ALTER TABLE tb_postos ADD COLUMN nm_municipio VARCHAR(100)");
        console.log("[DB] Added column nm_municipio to tb_postos");
      } catch (e: any) {
        if (!e.message.includes('Duplicate column name')) {
          console.warn("[DB] Error adding column nm_municipio to tb_postos:", e.message);
        }
      }

      // Add nm_bairro to tb_postos
      try {
        await pool.execute("ALTER TABLE tb_postos ADD COLUMN nm_bairro VARCHAR(100)");
        console.log("[DB] Added column nm_bairro to tb_postos");
      } catch (e: any) {
        if (!e.message.includes('Duplicate column name')) {
          console.warn("[DB] Error adding column nm_bairro to tb_postos:", e.message);
        }
      }

      // Seed some neighborhoods for Petrópolis stations if empty
      try {
        await pool.execute(`
          UPDATE tb_postos SET nm_bairro = 
            CASE 
              WHEN nm_posto LIKE '%SERRANO%' THEN 'Centro'
              WHEN nm_posto LIKE '%IPIRANGA%' AND nm_posto LIKE '%CENTRO%' THEN 'Centro'
              WHEN nm_posto LIKE '%ITAIPAVA%' THEN 'Itaipava'
              WHEN nm_posto LIKE '%QUITANDINHA%' THEN 'Quitandinha'
              WHEN nm_posto LIKE '%BINGEN%' THEN 'Bingen'
              WHEN nm_posto LIKE '%CORREAS%' THEN 'Corrêas'
              WHEN nm_posto LIKE '%RETIRO%' THEN 'Retiro'
              WHEN nm_posto LIKE '%CASCATINHA%' THEN 'Cascatinha'
              WHEN nm_posto LIKE '%VALPARAISO%' THEN 'Valparaíso'
              WHEN nm_posto LIKE '%CARANGOLA%' THEN 'Carangola'
              ELSE 'Centro'
            END
          WHERE (nm_bairro IS NULL OR nm_bairro = '') AND nm_municipio = 'Petrópolis'
        `);
      } catch (e) {}

      // Drop old columns if they exist
      try { await pool.execute("ALTER TABLE tb_motorista DROP COLUMN ds_status"); } catch (e) {}
      try { await pool.execute("ALTER TABLE tb_motorista DROP COLUMN fl_status"); } catch (e) {}
      
      // Normalize tb_veiculo
      const vehColumnsToAdd = [
        { name: 'nu_renavam', type: 'VARCHAR(11)' },
        { name: 'nm_marca', type: 'VARCHAR(150)' },
        { name: 'nm_modelo', type: 'VARCHAR(150)' },
        { name: 'id_placa', type: 'VARCHAR(10)' },
        { name: 'id_motorista', type: 'INT' },
        { name: 'fl_ativo', type: 'TINYINT(1) DEFAULT 1' }
      ];

      for (const col of vehColumnsToAdd) {
        try {
          await pool.execute(`ALTER TABLE tb_veiculo ADD COLUMN ${col.name} ${col.type}`);
          console.log(`[DB] Added column ${col.name} to tb_veiculo`);
        } catch (e: any) {
          if (e.message.includes('Duplicate column name')) {
             // In case column exists, ensure the type is correct (VARCHAR size)
             if (col.name === 'nm_marca' || col.name === 'nm_modelo') {
                await pool.execute(`ALTER TABLE tb_veiculo MODIFY COLUMN ${col.name} ${col.type}`);
             }
          } else {
            console.warn(`[DB] Error adding column ${col.name} to tb_veiculo:`, e.message);
          }
        }
      }

      // Drop old columns in tb_veiculo if they exist
      try { await pool.execute("ALTER TABLE tb_veiculo DROP COLUMN ds_renavam"); } catch (e) {}

      // Ensure tb_empresa has data
      try {
        await pool.execute("INSERT IGNORE INTO tb_empresa (id_empresa, nm_empresa) VALUES (1, 'AVULSO'), (2, 'Uber'), (3, '99 Taxi'), (4, 'iFood')");
      } catch (e) {}

      // Ensure tb_status has data
      try {
        await pool.execute(`
          INSERT IGNORE INTO tb_status (id_status, ds_status) VALUES 
          (1, 'PENDING_VERIFICATION'), 
          (2, 'PENDING_APPROVAL'), 
          (3, 'AUTHORIZED'), 
          (4, 'REJECTED'), 
          (5, 'SUSPENDED')
        `);
      } catch (e) {}

      // Ensure tb_motorista has id_empresa
      try {
        await pool.execute("ALTER TABLE tb_motorista ADD COLUMN id_empresa INT DEFAULT 1");
      } catch (e) {}

      // Create precos table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS tb_precos_combustiveis (
          id SERIAL PRIMARY KEY,
          id_posto INTEGER NOT NULL,
          id_combustivel INTEGER NOT NULL,
          vl_preco_venda DECIMAL(10, 3),
          dt_ultima_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ds_origem_dado VARCHAR(50) NOT NULL,
          CONSTRAINT uq_posto_combustivel UNIQUE (id_posto, id_combustivel),
          FOREIGN KEY (id_posto) REFERENCES tb_postos(id_posto),
          FOREIGN KEY (id_combustivel) REFERENCES tb_tipoproduto(id_produto)
        )
      `);

      // Create tb_empresa_contato
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS tb_empresa_contato (
          id_contato INT AUTO_INCREMENT PRIMARY KEY,
          id_empresa INT NOT NULL,
          nm_contato VARCHAR(150) NOT NULL,
          ds_email VARCHAR(150) NOT NULL,
          fl_ativo TINYINT(1) DEFAULT 1,
          dt_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT uq_empresa_contato_email UNIQUE (ds_email),
          FOREIGN KEY (id_empresa) REFERENCES tb_empresa(id_empresa)
        )
      `);

      // Seed default authorized backoffice contacts
      try {
        await pool.execute(`
          INSERT IGNORE INTO tb_empresa_contato (id_empresa, nm_contato, ds_email, fl_ativo) VALUES
          (1, 'Marcio Vasconcellos', 'marcio.vasconcellos@gmail.com', 1),
          (1, 'Enche O Tanque UCP', 'encheotanqueucp@gmail.com', 1),
          (1, 'Afonso Winter', 'afonsogwinter@gmail.com', 1)
        `);
      } catch (e) {
        console.warn("[DB] Error seeding tb_empresa_contato:", e);
      }

      // Seed and update these users as motoristas under id_empresa = 1 with AUTHORIZED status
      try {
        const usersToSeed = [
          { 
            email: 'marcio.vasconcellos@gmail.com', 
            name: 'Marcio Vasconcellos',
            phone: '(11) 99999-0001',
            license: 'Cat E',
            licenseExpiry: '2027-08-20',
            status: 'active',
            performance: 98,
            hiringDate: '2023-01-10',
            lastMedicalExam: '2024-02-12',
            totalRoutes: 250,
            totalKm: 18000,
            recentIncidents: 0,
            observations: 'Contato administrativo central e motorista de prontidão.'
          },
          { 
            email: 'encheotanqueucp@gmail.com', 
            name: 'Enche O Tanque UCP',
            phone: '(11) 99999-0002',
            license: 'Cat AE',
            licenseExpiry: '2026-11-22',
            status: 'active',
            performance: 99,
            hiringDate: '2022-05-15',
            lastMedicalExam: '2024-03-01',
            totalRoutes: 540,
            totalKm: 42000,
            recentIncidents: 0,
            observations: 'Administrador geral e supervisor operacional da frota.'
          },
          { 
            email: 'afonsogwinter@gmail.com', 
            name: 'Afonso Winter',
            phone: '(11) 99999-0003',
            license: 'Cat D',
            licenseExpiry: '2025-05-18',
            status: 'on-break',
            performance: 92,
            hiringDate: '2023-06-01',
            lastMedicalExam: '2024-01-20',
            totalRoutes: 110,
            totalKm: 9800,
            recentIncidents: 1,
            observations: 'Motorista de rotas curtas municipais.'
          },
          // Mock drivers of the fleet
          {
            email: 'joao.silva@fleet.com',
            name: 'João Silva',
            phone: '(11) 98765-4321',
            license: 'Cat AE',
            licenseExpiry: '2025-12-10',
            status: 'active',
            performance: 95,
            hiringDate: '2020-05-15',
            lastMedicalExam: '2024-01-10',
            totalRoutes: 1450,
            totalKm: 125400,
            recentIncidents: 0,
            observations: 'Motorista exemplar, mantém o veículo sempre limpo e reporta manutenções preventivas.'
          },
          {
            email: 'maria.santos@fleet.com',
            name: 'Maria Santos',
            phone: '(11) 98765-4322',
            license: 'Cat E',
            licenseExpiry: '2024-06-15',
            status: 'active',
            performance: 88,
            hiringDate: '2021-08-22',
            lastMedicalExam: '2023-11-15',
            totalRoutes: 820,
            totalKm: 78500,
            recentIncidents: 1,
            observations: 'Boa conduta, mas precisa melhorar o consumo médio em rotas de serra.'
          },
          {
            email: 'carlos.oliveira@fleet.com',
            name: 'Carlos Oliveira',
            phone: '(11) 98765-4323',
            license: 'Cat AD',
            licenseExpiry: '2026-01-20',
            status: 'on-break',
            performance: 72,
            phone_original: '(11) 98765-4323',
            hiringDate: '2019-11-30',
            lastMedicalExam: '2023-01-05',
            totalRoutes: 2100,
            totalKm: 280000,
            recentIncidents: 2,
            observations: 'Afastado temporariamente para regularização de exames complementares.'
          },
          {
            email: 'ana.costa@fleet.com',
            name: 'Ana Costa',
            phone: '(11) 98765-4324',
            license: 'Cat E',
            licenseExpiry: '2024-02-10',
            status: 'off',
            performance: 91,
            hiringDate: '2022-03-10',
            lastMedicalExam: '2023-09-20',
            totalRoutes: 340,
            totalKm: 42000,
            recentIncidents: 0,
            observations: 'Motorista nova na frota, demonstrando alto comprometimento com prazos.'
          }
        ];

        for (const u of usersToSeed) {
          const [existingMotorista]: any = await pool.execute(
            "SELECT id_motorista FROM tb_motorista WHERE ds_email = ?",
            [u.email]
          );

          if (existingMotorista.length === 0) {
            await pool.execute(`
              INSERT INTO tb_motorista (
                nm_mot, ds_email, ds_telefone, nu_mot_cnh, dt_mot_cnh_val,
                id_empresa, id_status, fl_verificado, fl_ativo, dt_cadastro,
                dt_contratacao, dt_ultimo_aso, ds_observations, nu_performance, ds_status_fleet, nu_mot_cpf
              ) VALUES (?, ?, ?, ?, ?, 1, 3, 1, 1, NOW(), ?, ?, ?, ?, ?, '')
            `, [
              u.name, 
              u.email, 
              u.phone, 
              u.license, 
              u.licenseExpiry, 
              u.hiringDate, 
              u.lastMedicalExam, 
              u.observations, 
              u.performance, 
              u.status
            ]);
            console.log(`[DB] Seeded driver in tb_motorista: ${u.email}`);
          } else {
            await pool.execute(`
              UPDATE tb_motorista SET 
                id_empresa = 1, 
                id_status = 3, 
                fl_verificado = 1, 
                fl_ativo = 1,
                ds_telefone = COALESCE(ds_telefone, ?),
                nu_mot_cnh = COALESCE(nu_mot_cnh, ?),
                dt_mot_cnh_val = COALESCE(dt_mot_cnh_val, ?),
                dt_contratacao = COALESCE(dt_contratacao, ?),
                dt_ultimo_aso = COALESCE(dt_ultimo_aso, ?),
                ds_observations = COALESCE(ds_observations, ?),
                nu_performance = COALESCE(nu_performance, ?),
                ds_status_fleet = COALESCE(ds_status_fleet, ?)
              WHERE ds_email = ?
            `, [
              u.phone, 
              u.license, 
              u.licenseExpiry, 
              u.hiringDate, 
              u.lastMedicalExam, 
              u.observations, 
              u.performance, 
              u.status,
              u.email
            ]);
            console.log(`[DB] Updated driver properties to Empresa 1 & AUTHORIZED for: ${u.email}`);
          }
        }
      } catch (e: any) {
        console.warn("[DB] Error seeding these users in tb_motorista:", e.message);
      }

      return true;
    } catch (err) {
      console.warn("[DB] Error initializing schema:", err);
      return false;
    }
  }

  app.get("/api/rankings", async (req, res) => {
    try {
      const { id_combustivel, municipio } = req.query;
      const idComb = parseInt(id_combustivel as string, 10);
      const city = (municipio as string) || "Petrópolis";

      if (isNaN(idComb)) return res.status(400).json({ error: "id_combustivel é obrigatório" });

      // Get latest price per station for the selected fuel in the city, merging tb_precos_combustiveis and tb_abastecimentos
      const query = `
        SELECT 
          p.id_posto, p.nm_posto, p.nm_bandeira, p.nm_bairro, p.nm_municipio,
          u.price, u.date_collected as date, u.source,
          p.geo_latitude as lat, p.geo_longitude as lng
        FROM tb_postos p
        JOIN (
          SELECT 
            id_posto,
            price,
            date_collected,
            source
          FROM (
            SELECT 
              id_posto,
              price,
              date_collected,
              source,
              ROW_NUMBER() OVER (PARTITION BY id_posto ORDER BY date_collected DESC) as rn
            FROM (
              SELECT 
                id_posto,
                vl_preco_venda as price,
                dt_ultima_atualizacao as date_collected,
                ds_origem_dado as source
              FROM tb_precos_combustiveis
              WHERE id_produto = ? AND vl_preco_venda IS NOT NULL AND vl_preco_venda > 0

              UNION ALL

              SELECT 
                id_posto,
                vl_preco_unitario as price,
                dh_emissao_nfe as date_collected,
                'USER_ABASTECIMENTO' as source
              FROM tb_abastecimentos
              WHERE id_combustivel = ? AND vl_preco_unitario IS NOT NULL AND vl_preco_unitario > 0
            ) raw_nested
          ) with_rn
          WHERE rn = 1
        ) u ON p.id_posto = u.id_posto
        WHERE p.nm_municipio = ?
      `;

      const [rows]: any = await pool.execute(query, [idComb, idComb, city]);
      
      if (rows.length === 0) return res.json({ neighborhoods: [], brands: [], stations: [], cityAverage: 0 });

      // Calculate city average
      const cityAverage = rows.reduce((acc: number, r: any) => acc + parseFloat(r.price), 0) / rows.length;

      // Group by Neighborhood
      const neighborhoodGroups: Record<string, any> = {};
      rows.forEach((r: any) => {
        const b = r.nm_bairro || "Centro";
        if (!neighborhoodGroups[b]) {
          neighborhoodGroups[b] = { name: b, prices: [], count: 0 };
        }
        neighborhoodGroups[b].prices.push(parseFloat(r.price));
        neighborhoodGroups[b].count++;
      });
      const neighborhoods = Object.values(neighborhoodGroups).map((g: any) => ({
        name: g.name,
        averagePrice: g.prices.reduce((a: number, b: number) => a + b, 0) / g.count,
        stationCount: g.count,
        variation: (g.prices.reduce((a: number, b: number) => a + b, 0) / g.count) - cityAverage
      })).sort((a, b) => a.averagePrice - b.averagePrice);

      // Group by Brand
      const brandGroups: Record<string, any> = {};
      rows.forEach((r: any) => {
        const b = r.nm_bandeira || "Branca";
        if (!brandGroups[b]) {
          brandGroups[b] = { name: b, prices: [], count: 0 };
        }
        brandGroups[b].prices.push(parseFloat(r.price));
        brandGroups[b].count++;
      });
      const brands = Object.values(brandGroups).map((g: any) => ({
        name: g.name,
        averagePrice: g.prices.reduce((a: number, b: number) => a + b, 0) / g.count,
        stationCount: g.count,
        variation: (g.prices.reduce((a: number, b: number) => a + b, 0) / g.count) - cityAverage
      })).sort((a, b) => a.averagePrice - b.averagePrice);

      // Individual Stations
      const stations = rows.map((r: any) => ({
        id: r.id_posto,
        name: r.nm_posto,
        brand: r.nm_bandeira,
        neighborhood: r.nm_bairro || "Centro",
        price: parseFloat(r.price),
        distance: (2.3 + Math.random() * 5).toFixed(1) // Simulated distance
      })).sort((a: any, b: any) => a.price - b.price);

      res.json({
        neighborhoods,
        brands,
        stations,
        cityAverage
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro ao gerar rankings" });
    }
  });

  // API Route to save QR Code
  app.post("/api/save-qrcode", async (req, res) => {
    const { url, vehicleId } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      if (vehicleId) {
        console.log(`[INFO] QR Code ${url} linked to Vehicle ID: ${vehicleId}`);
      }

      // SIMULATION: Check if URL already exists
      const [rows] = await pool.execute(
        "SELECT url_qrcode FROM tb_qrcode WHERE url_qrcode = ? LIMIT 1",
        [url]
      );
      
      const alreadyExists = (rows as any[]).length > 0;

      // Save it with vehicle link if provided
      const [result] = await pool.execute(
        "INSERT INTO tb_qrcode (url_qrcode, id_veiculo) VALUES (?, ?)",
        [url, vehicleId || null]
      );

      res.json({ 
        success: true, 
        id: (result as any).insertId,
        warning: alreadyExists ? "DUPLICATE_SIMULATED" : null
      });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to save to database" });
    }
  });

  // API Route to fetch history
  app.get("/api/history", async (req, res) => {
    const token = req.cookies.session;
    try {
      let email = "";
      if (token) {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        email = decoded.email;
      }

      const { id_veiculo } = req.query;
      
      let query;
      let params: any[] = [];

      if (id_veiculo) {
        // If we have a vehicle ID but no email, we can't verify ownership strictly here 
        // but let's assume if they have the ID they can see it, or better yet, verify if possible.
        if (email) {
          query = `
            SELECT 
              q.id_qrcode, q.url_qrcode, q.dt_qrcode, q.id_veiculo, q.dh_processamento, q.fl_processado,
              DATE_FORMAT(q.dt_qrcode, '%Y-%m-%dT%H:%i:%s') as iso_date,
              DATE_FORMAT(q.dt_qrcode, '%d/%m/%Y %H:%i') as formatted_date,
              a.vl_preco_unitario, a.nu_litros, a.vl_economia, a.dh_emissao_nfe,
              p.nm_posto, p.nm_municipio,
              tp.ds_produto
            FROM tb_qrcode q
            JOIN tb_veiculo v ON q.id_veiculo = v.id_veiculo
            LEFT JOIN tb_abastecimentos a ON q.id_qrcode = a.id_qrcode AND (
              a.id_preco = (
                SELECT id_preco 
                FROM tb_abastecimentos sub1 
                WHERE sub1.id_qrcode = q.id_qrcode 
                ORDER BY (sub1.id_combustivel = COALESCE(v.id_comb_pref, sub1.id_combustivel)) DESC, sub1.nu_litros DESC, sub1.id_preco ASC
                LIMIT 1
              )
            )
            LEFT JOIN tb_postos p ON a.id_posto = p.id_posto
            LEFT JOIN tb_tipoproduto tp ON a.id_combustivel = tp.id_produto
            JOIN tb_motorista m ON v.id_motorista = m.id_motorista
            WHERE q.id_veiculo = ? AND m.ds_email = ?
            ORDER BY q.dt_qrcode DESC, a.dh_emissao_nfe ASC
          `;
          params = [id_veiculo, email];
        } else {
          query = `
            SELECT 
              q.id_qrcode, q.url_qrcode, q.dt_qrcode, q.id_veiculo, q.dh_processamento, q.fl_processado,
              DATE_FORMAT(q.dt_qrcode, '%Y-%m-%dT%H:%i:%s') as iso_date,
              DATE_FORMAT(q.dt_qrcode, '%d/%m/%Y %H:%i') as formatted_date,
              a.vl_preco_unitario, a.nu_litros, a.vl_economia, a.dh_emissao_nfe,
              p.nm_posto, p.nm_municipio,
              tp.ds_produto
            FROM tb_qrcode q
            JOIN tb_veiculo v ON q.id_veiculo = v.id_veiculo
            LEFT JOIN tb_abastecimentos a ON q.id_qrcode = a.id_qrcode AND (
              a.id_preco = (
                SELECT id_preco 
                FROM tb_abastecimentos sub1 
                WHERE sub1.id_qrcode = q.id_qrcode 
                ORDER BY (sub1.id_combustivel = COALESCE(v.id_comb_pref, sub1.id_combustivel)) DESC, sub1.nu_litros DESC, sub1.id_preco ASC
                LIMIT 1
              )
            )
            LEFT JOIN tb_postos p ON a.id_posto = p.id_posto
            LEFT JOIN tb_tipoproduto tp ON a.id_combustivel = tp.id_produto
            WHERE q.id_veiculo = ? 
            ORDER BY q.dt_qrcode DESC, a.dh_emissao_nfe ASC
          `;
          params = [id_veiculo];
        }
      } else {
        if (email) {
          // Fetch all history for this user
          query = `
            SELECT 
              q.id_qrcode, q.url_qrcode, q.dt_qrcode, q.id_veiculo, q.dh_processamento, q.fl_processado,
              DATE_FORMAT(q.dt_qrcode, '%Y-%m-%dT%H:%i:%s') as iso_date,
              DATE_FORMAT(q.dt_qrcode, '%d/%m/%Y %H:%i') as formatted_date,
              a.vl_preco_unitario, a.nu_litros, a.vl_economia, a.dh_emissao_nfe,
              p.nm_posto, p.nm_municipio,
              tp.ds_produto
            FROM tb_qrcode q
            JOIN tb_veiculo v ON q.id_veiculo = v.id_veiculo
            LEFT JOIN tb_abastecimentos a ON q.id_qrcode = a.id_qrcode AND (
              a.id_preco = (
                SELECT id_preco 
                FROM tb_abastecimentos sub1 
                WHERE sub1.id_qrcode = q.id_qrcode 
                ORDER BY (sub1.id_combustivel = COALESCE(v.id_comb_pref, sub1.id_combustivel)) DESC, sub1.nu_litros DESC, sub1.id_preco ASC
                LIMIT 1
              )
            )
            LEFT JOIN tb_postos p ON a.id_posto = p.id_posto
            LEFT JOIN tb_tipoproduto tp ON a.id_combustivel = tp.id_produto
            JOIN tb_motorista m ON v.id_motorista = m.id_motorista
            WHERE m.ds_email = ?
            ORDER BY q.dt_qrcode DESC, a.dh_emissao_nfe ASC
          `;
          params = [email];
        } else {
          // No email, no vehicle, return empty or limit 0
          return res.json([]);
        }
      }

      const [rows] = await pool.execute(query, params);
      res.json(rows);
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  // API Route to fetch fuel types
  app.get("/api/fuel-types", async (req, res) => {
    try {
      const [rows] = await pool.execute("SELECT * FROM tb_tipoproduto");
      res.json(rows);
    } catch (error) {
      console.error("Database error fetching fuel types:", error);
      res.status(500).json({ error: "Failed to fetch fuel types" });
    }
  });

  // API Route to fetch unique cities from stations
  app.get("/api/cities", async (req, res) => {
    try {
      const [rows] = await pool.execute("SELECT DISTINCT nm_municipio FROM tb_postos WHERE nm_municipio IS NOT NULL AND nm_municipio != '' ORDER BY nm_municipio");
      res.json((rows as any[]).map(r => r.nm_municipio));
    } catch (error) {
      console.error("Database error fetching cities:", error);
      res.status(500).json({ error: "Failed to fetch cities" });
    }
  });

  // API Route to fetch my vehicles linked to the driver's email (OAuth/Login)
  app.get("/api/my-vehicles", async (req, res) => {
    try {
      const { email } = req.query;
      
      if (!email) {
        return res.json([]);
      }
 
      // Query vehicles joining with drivers by email, only active ones
      const query = `
        SELECT v.* 
        FROM tb_veiculo v
        JOIN tb_motorista m ON v.id_motorista = m.id_motorista
        WHERE m.ds_email = ? AND (v.fl_ativo IS NULL OR v.fl_ativo = 1)
      `;
      
      const [rows] = await pool.execute(query, [email]);
      
      // Disable caching for this critical compliance route
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.json(rows);
    } catch (error) {
      console.error("Database error fetching vehicles:", error);
      res.status(500).json({ error: "Failed to fetch vehicles" });
    }
  });

  // API Route to deactivate a vehicle
  app.post("/api/vehicle/deactivate", async (req, res) => {
    const token = req.cookies.session;
    const { vehicleId } = req.body;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    if (!vehicleId) return res.status(400).json({ error: "Vehicle ID required" });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      
      // Verify the vehicle belongs to the authenticated user
      const [rows] = await pool.execute(`
        SELECT v.id_veiculo 
        FROM tb_veiculo v
        JOIN tb_motorista m ON v.id_motorista = m.id_motorista
        WHERE v.id_veiculo = ? AND m.ds_email = ?
      `, [vehicleId, decoded.email]);

      if ((rows as any[]).length === 0) {
        return res.status(403).json({ error: "Vehicle not found or access denied" });
      }

      await pool.execute(
        "UPDATE tb_veiculo SET fl_ativo = 0 WHERE id_veiculo = ?",
        [vehicleId]
      );

      res.json({ success: true });
    } catch (e) {
      console.error("[VEHICLE_DEACTIVATE] Error:", e);
      res.status(500).json({ error: "Erro ao desativar veículo" });
    }
  });

  // API Route to fetch latest fuel prices around user
  app.get("/api/search-stations", async (req, res) => {
    try {
      const { lat, lng, radius, id_combustivel } = req.query;
      
      if (!lat || !lng || !radius || !id_combustivel) {
        return res.status(400).json({ error: "Missing parameters" });
      }

      // Server-side enforcement of access rule
      const token = req.cookies.session;
      if (!token) {
        console.warn("[SEARCH] No session token found in cookies");
        return res.status(401).json({ error: "Sessão não encontrada. Por favor, faça login novamente." });
      }

      let userEmail = "";
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        userEmail = decoded.email;
        
        // Check access eligibility
        const [accessCheck]: any = await pool.execute(`
          SELECT 
            m.fl_primeira_busca, 
            m.dt_cadastro,
            MAX(q.dt_qrcode) as last_scan
          FROM tb_motorista m
          LEFT JOIN tb_veiculo v ON m.id_motorista = v.id_motorista
          LEFT JOIN tb_qrcode q ON v.id_veiculo = q.id_veiculo
          WHERE m.ds_email = ?
          GROUP BY m.id_motorista, m.fl_primeira_busca, m.dt_cadastro
        `, [userEmail]);

        if (accessCheck.length > 0) {
          const { fl_primeira_busca, dt_cadastro, last_scan } = accessCheck[0];
          const now = new Date();
          const regDate = dt_cadastro ? new Date(dt_cadastro) : now;
          const hoursSinceReg = (now.getTime() - regDate.getTime()) / (1000 * 60 * 60);
          
          let hasAccess = false;
          if (fl_primeira_busca === 1) hasAccess = true;
          if (hoursSinceReg <= 24) hasAccess = true;
          if (last_scan) {
            const diffDays = (now.getTime() - new Date(last_scan).getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays <= 7) hasAccess = true;
          }

/* Commented out temporarily per user request - allowing access even if expired 
          if (!hasAccess) {
            console.log(`[SEARCH] Access denied for ${userEmail}. Access expired.`);
            return res.status(403).json({ error: "Acesso expirado. Escaneie uma nova nota fiscal para liberar mais 7 dias." });
          }
*/
        }

        // Update first search flag
        await pool.execute("UPDATE tb_motorista SET fl_primeira_busca = 0 WHERE ds_email = ?", [userEmail]);
      } catch (e: any) {
        console.error("[SEARCH] Auth/Access error:", e.message);
        return res.status(401).json({ error: "Sessão inválida: " + e.message });
      }

      const userLat = parseFloat(lat as string);
      const userLng = parseFloat(lng as string);
      const radKm = parseFloat(radius as string);
      const idComb = parseInt(id_combustivel as string, 10);

      if (isNaN(userLat) || isNaN(userLng) || isNaN(radKm) || isNaN(idComb)) {
         return res.status(400).json({ error: "Invalid numeric parameters" });
      }

      // Query to get the latest price per station for the specified fuel, combining tb_precos_combustiveis and tb_abastecimentos
      const query = `
        SELECT 
          p.id_posto, 
          p.nm_posto, 
          p.nm_bandeira,
          p.nm_municipio, 
          p.geo_latitude as lat, 
          p.geo_longitude as lng,
          u.price,
          u.date_collected,
          u.source
        FROM tb_postos p
        JOIN (
          SELECT 
            id_posto,
            price,
            date_collected,
            source
          FROM (
            SELECT 
              id_posto,
              price,
              date_collected,
              source,
              ROW_NUMBER() OVER (PARTITION BY id_posto ORDER BY date_collected DESC) as rn
            FROM (
              SELECT 
                id_posto,
                vl_preco_venda as price,
                dt_ultima_atualizacao as date_collected,
                ds_origem_dado as source
              FROM tb_precos_combustiveis
              WHERE id_produto = ? AND vl_preco_venda IS NOT NULL AND vl_preco_venda > 0

              UNION ALL

              SELECT 
                id_posto,
                vl_preco_unitario as price,
                dh_emissao_nfe as date_collected,
                'USER_ABASTECIMENTO' as source
              FROM tb_abastecimentos
              WHERE id_combustivel = ? AND vl_preco_unitario IS NOT NULL AND vl_preco_unitario > 0
            ) raw_nested
          ) with_rn
          WHERE rn = 1
        ) u ON p.id_posto = u.id_posto
        WHERE p.geo_latitude IS NOT NULL AND p.geo_longitude IS NOT NULL
      `;

      const [rows] = await pool.execute(query, [idComb, idComb]);
      
      // Calculate distances and filter by radius in javascript because MySQL lat/lng are formatted strings (-22:30:58.591)
      const parseLatLong = (coordStr: string) => {
        if (!coordStr) return 0;
        // Basic check if it contains colon, assume degrees:minutes:seconds or degrees:minutes format
        if (coordStr.includes(':')) {
           const parts = coordStr.split(':');
           const degrees = parseFloat(parts[0]);
           const minutes = parseFloat(parts[1]) || 0;
           const seconds = parseFloat(parts[2] || '0');
           const sign = degrees < 0 ? -1 : 1;
           return sign * (Math.abs(degrees) + (minutes / 60) + (seconds / 3600));
        }
        return parseFloat(coordStr);
      };

      const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;  
        const dLon = (lon2 - lon1) * Math.PI / 180; 
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2); 
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        return R * c; // Distance in km
      };

      const allResults = rows as any[];
      const filteredResults = [];

      for (const row of allResults) {
         const latNum = parseLatLong(row.lat);
         const lngNum = parseLatLong(row.lng);
         const dist = haversineDistance(userLat, userLng, latNum, lngNum);
         
         if (dist <= radKm) {
            filteredResults.push({
               ...row,
               lat: latNum, // Pass parsed coordinates exactly as needed for google maps
               lng: lngNum,
               distance: dist
            });
         }
      }

      // Sort by price before ranking
      filteredResults.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

      // Map each municipality in allResults to its maximum price
      const maxPriceByMunicipio: Record<string, number> = {};
      for (const r of allResults) {
         if (r.nm_municipio && r.price) {
            const muniKey = r.nm_municipio.trim().toUpperCase();
            const pVal = parseFloat(r.price);
            if (!isNaN(pVal) && pVal > 0) {
               if (maxPriceByMunicipio[muniKey] === undefined || pVal > maxPriceByMunicipio[muniKey]) {
                  maxPriceByMunicipio[muniKey] = pVal;
               }
            }
         }
      }

      // Calculate ranks for the top 3 cheapest
      let currentRank = 1;
      let lastPrice = -1;

      const finalResults = filteredResults.map((row, index) => {
        const priceNum = parseFloat(row.price);
        if (index === 0) {
          lastPrice = priceNum;
        } else if (priceNum > lastPrice) {
          lastPrice = priceNum;
          currentRank++;
        }
        
        const muniKey = row.nm_municipio ? row.nm_municipio.trim().toUpperCase() : "";
        const maxPriceInMunicipio = muniKey ? (maxPriceByMunicipio[muniKey] || priceNum) : priceNum;
        
        return {
          ...row,
          rank: currentRank <= 3 ? currentRank : null,
          maxPriceInMunicipio
        };
      });

      res.json(finalResults);
    } catch (error) {
      console.error("Database error filtering stations:", error);
      res.status(500).json({ error: "Failed to search stations" });
    }
  });

  // Helper to get consistent redirect URI based on the actual request host
  const getRedirectUri = (req: any) => {
    const host = req.headers["x-forwarded-host"] || req.get("host") || "";
    
    // Improved protocol detection: 
    // Proxy (Cloud Run) usually provides x-forwarded-proto.
    // If we are on a real domain (ending in .run.app or encheotanque.net.br), always use https.
    let protocol = "https";
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
    }
    
    // Log for debugging
    console.log(`[AUTH] Protocol: ${protocol}, Host: ${host}, Forwarded-Host: ${req.headers["x-forwarded-host"]}`);

    // 1. If the current request host is a real domain (not aistudio proxy), use it!
    // This allows OAuth to work on dev, pre, and custom domains simultaneously.
    if (host && !host.includes("aistudio.google.com")) {
      return `${protocol}://${host}/auth/callback`;
    }

    // 2. If we are in the AI Studio proxy, we MUST use a real external URL.
    // Google OAuth does not allow internal proxy URLs.
    const appUrl = process.env.APP_URL;
    if (appUrl && !appUrl.includes("aistudio.google.com")) {
      try {
        const url = new URL(appUrl);
        return `${url.origin}/auth/callback`;
      } catch (e) {
        console.warn("[AUTH] Invalid APP_URL for redirect:", appUrl);
      }
    }

    // 3. Last resort fallback (might fail Google validation but better than nothing)
    return `${protocol}://${host}/auth/callback`;
  };

  // DEBUG ENDPOINT
  app.get("/api/debug/auth", (req, res) => {
    res.json({
      APP_URL: process.env.APP_URL,
      detectedHost: req.get("host"),
      detectedProto: req.headers["x-forwarded-proto"] || req.protocol,
      derivedRedirectUri: getRedirectUri(req),
      nodeEnv: process.env.NODE_ENV,
      googleClientIdConfigured: !!process.env.GOOGLE_CLIENT_ID
    });
  });

  app.post("/api/feedback", async (req, res) => {
    const { message } = req.body;
    const token = req.cookies.session;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: "Mensagem é obrigatória" });
    }

    let userEmail = "Anônimo";
    let userName = "Anônimo";
    let userPhone = "Não informado";

    if (token) {
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        userEmail = decoded.email;
        
        // Fetch full data from DB to get latest name/phone
        const [rows]: any = await pool.execute(
          "SELECT nm_mot, ds_telefone FROM tb_motorista WHERE ds_email = ?",
          [userEmail]
        );
        
        if (rows.length > 0) {
          userName = rows[0].nm_mot || "Sem Nome";
          userPhone = rows[0].ds_telefone || "Não informado";
        }
      } catch (e) {}
    }

    const success = await sendFeedbackEmail(userEmail, message, userName, userPhone);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Erro ao processar feedback. Tente novamente mais tarde." });
    }
  });

  app.post("/api/contact", async (req, res) => {
    const { name, phone, email, message } = req.body;

    if (!name || name.trim().length === 0 || !phone || phone.trim().length === 0 || !email || email.trim().length === 0 || !message || message.trim().length === 0) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }

    if (message.length > 1024) {
      return res.status(400).json({ error: "A mensagem deve ter no máximo 1KB" });
    }

    const success = await sendContactEmail(email, message, name, phone);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Erro ao processar mensagem. Tente novamente mais tarde." });
    }
  });

  // GOOGLE OAUTH ENDPOINTS
  app.get("/api/auth/google/url", (req, res) => {
    try {
      const redirectUri = getRedirectUri(req);
      const client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );

      console.log("Generating Auth URL. Redirect URI:", redirectUri);

      const url = client.generateAuthUrl({
        access_type: "offline",
        scope: [
          "openid",
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
        ],
        redirect_uri: redirectUri, // Pass explicitly again
        state: redirectUri,
        prompt: "select_account",
      });
      
      res.json({ url });
    } catch (e) {
      console.error("Error generating Auth URL:", e);
      res.status(500).json({ error: "Erro ao configurar autenticação Google" });
    }
  });

  app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
    const { code, state } = req.query;
    
    try {
      // Prioritize the URI from state (it's what we sent to Google)
      const redirectUri = (state as string) || getRedirectUri(req);
      
      const client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );

      console.log("Auth Callback. Using Redirect URI:", redirectUri);
      
      if (!code) throw new Error("No code provided by Google");
      
      const { tokens } = await client.getToken(code as string);
      client.setCredentials(tokens);

      if (!tokens.id_token) throw new Error("No ID Token in response");

      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      
      const payload = ticket.getPayload();
      const email = payload?.email;
      const googleName = payload?.name;
      const googlePhoto = payload?.picture;

      if (!email) throw new Error("E-mail não encontrado no token do Google");

      if (googlePhoto) {
        try {
          await pool.execute("UPDATE tb_motorista SET ds_google_foto = ? WHERE ds_email = ?", [googlePhoto, email]);
          console.log(`[AUTH] Updated google photo for ${email}`);
        } catch (e) {
          console.warn(`[AUTH] Failed to update google photo for ${email}:`, e);
        }
      }

      // Check for user in DB as driver
      const [rows] = await pool.execute(
        "SELECT m.id_motorista, m.nm_mot, s.ds_status, m.id_status, m.fl_verificado, m.ds_google_foto FROM tb_motorista m JOIN tb_status s ON m.id_status = s.id_status WHERE m.ds_email = ?",
        [email]
      );
      
      const drivers = rows as any[];
      let driver = drivers[0];

      // Check if authorized backoffice contact in tb_empresa_contato
      const [contactRows] = await pool.execute(
        "SELECT id_contato, nm_contato, ds_email FROM tb_empresa_contato WHERE ds_email = ? AND fl_ativo = 1 AND tp_contato = 'A'",
        [email]
      );
      const contacts = contactRows as any[];
      const isAuthorizedContact = contacts.length > 0;

      // Check for Admin privileges
      const isAdminEmail = [
        "marcio.vasconcellos@gmail.com", 
        "afonsogwinter@gmail.com",
        "encheotanqueucp@gmail.com",
        ...contacts.map((c: any) => c.ds_email.toLowerCase())
      ].some(admin => email.toLowerCase() === admin.toLowerCase());

      if (driver && driver.id_status === 4 && !isAuthorizedContact) {
         return res.send(`
          <html>
            <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #000; color: #fff; margin: 0; text-align: center;">
              <div style="padding: 24px; border: 1px solid #333; border-radius: 16px; background: #1a1a1a; max-width: 400px;">
                <div style="font-size: 48px; margin-bottom: 16px;">🛑</div>
                <h1 style="color: #ff5252; font-size: 20px; margin-bottom: 12px;">Acesso Bloqueado</h1>
                <p style="color: #aaa; line-height: 1.5; font-size: 14px;">Sua conta foi suspensa. Entre em contato com a administração.</p>
                <button onclick="window.close()" style="background: #333; color: white; border: none; padding: 12px 24px; border-radius: 12px; cursor: pointer; font-weight: bold; margin-top: 20px; width: 100%;">FECHAR JANELA</button>
              </div>
            </body>
          </html>
        `);
      }
      
      // If user is not found in tb_motorista and is NOT an authorized contact in tb_empresa_contato, force registration
      if (drivers.length === 0 && !isAuthorizedContact) {
         // Create a temporary JWT just for registration
         const regToken = jwt.sign({ email, name: googleName, photoURL: googlePhoto, registerRequired: true }, JWT_SECRET, { expiresIn: '1h' });
         res.cookie("session", regToken, { 
           secure: true, 
           sameSite: "none", 
           httpOnly: true,
           path: '/'
         });
         
         return res.send(`
          <html>
            <body style="background: #000; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
              <div style="text-align: center; border: 1px solid #333; padding: 40px; border-radius: 20px; background: #111;">
                <h1 style="color: #13ec13; margin-bottom: 20px;">Autenticado!</h1>
                <p>Quase lá! Agora finalize seu cadastro no app.</p>
                <div style="margin: 20px 0; color: #666; font-size: 12px;">Esta janela fechará automaticamente...</div>
                <script>
                  const data = { type: 'OAUTH_AUTH_SUCCESS', user: { email: "${email}", name: "${googleName}", photoURL: "${googlePhoto || ''}", registerRequired: true } };
                  if (window.opener) {
                    window.opener.postMessage(data, '*');
                    setTimeout(() => window.close(), 1000);
                  } else {
                    document.body.innerHTML += '<p style="color:red">Erro: Janela principal não encontrada. Por favor, volte ao app e atualize a página.</p>';
                  }
                </script>
              </div>
            </body>
          </html>
        `);
      }

      // Create a valid authenticated session token
      const sessionToken = jwt.sign(
        { 
          email, 
          name: driver?.nm_mot || contacts[0]?.nm_contato || googleName, 
          id: driver?.id_motorista || null,
          status: driver?.ds_status || 'AUTHORIZED',
          verified: driver ? !!driver.fl_verificado : true,
          isAdmin: isAdminEmail
        }, 
        JWT_SECRET, 
        { expiresIn: "7d" }
      );

      res.cookie("session", sessionToken, {
        secure: true,
        sameSite: "none",
        httpOnly: true,
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.send(`
        <html>
          <body style="background: #000; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center;">
            <div style="text-align: center; border: 1px solid #333; padding: 40px; border-radius: 20px; background: #111; max-width: 400px;">
              <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
              <h1 style="color: #13ec13; font-size: 24px;">Autenticado!</h1>
              <p style="color: #aaa; margin-bottom: 20px;">Bem-vindo ao Enche o Tanque.</p>
              <div style="margin: 20px 0; color: #666; font-size: 11px;">Esta janela fechará sozinha...</div>
              <script>
                const userData = ${JSON.stringify({ email, name: driver?.nm_mot || contacts[0]?.nm_contato || googleName, googlePhotoURL: driver?.ds_google_foto || googlePhoto || '' })};
                if (window.opener) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: userData }, '*');
                  setTimeout(() => window.close(), 1000);
                } else {
                  setTimeout(() => window.close(), 3000);
                }
              </script>
            </div>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("OAuth exchange failed:", error);
      res.status(500).send(`
        <body style="font-family: sans-serif; background: #121212; color: #fff; padding: 40px; text-align: center;">
          <h2 style="color: #ff5252;">Erro na Autenticação</h2>
          <p>${error.message || "Erro desconhecido"}</p>
          <div style="margin-top: 30px; border-top: 1px solid #333; padding-top: 20px;">
            <p style="font-size: 12px; color: #666;">Confirme as URIs no Google Cloud Console:</p>
            <code style="background: #000; padding: 8px; border-radius: 4px; display: block; overflow-x: auto;">
              ${getRedirectUri(req)}
            </code>
          </div>
          <button onclick="window.close()" style="margin-top: 30px; padding: 12px 24px; border-radius: 8px; border: none; background: #333; color: #fff; cursor: pointer; font-weight: bold;">FECHAR E REVER</button>
        </body>
      `);
    }
  });

  // Helper to get the full public URL of the application
  function getAppBaseUrl(req: any) {
    if (process.env.APP_URL) return process.env.APP_URL;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${protocol}://${host}`;
  }

  app.post("/api/auth/register", async (req, res) => {
    const token = req.cookies.session;
    const { phone, cpf, cnh, cnhExpiration } = req.body;
    if (!token) return res.status(401).json({ error: "No registration token" });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      if (!decoded.registerRequired) throw new Error("Invalid registration state");

      // Strip mask from CPF
      const cleanCpf = cpf ? cpf.replace(/\D/g, '') : '';

      // Check if user already exists
      const [existing]: any = await pool.execute("SELECT id_motorista FROM tb_motorista WHERE ds_email = ?", [decoded.email]);
      
      let driverId: number;

      if (existing.length > 0) {
        // Update existing record
        driverId = existing[0].id_motorista;
        await pool.execute(
          "UPDATE tb_motorista SET ds_telefone = ?, nu_mot_cpf = ?, nu_mot_cnh = ?, dt_mot_cnh_val = ?, ds_google_foto = COALESCE(ds_google_foto, ?), id_status = 1, fl_verificado = 0, dt_cadastro = COALESCE(dt_cadastro, NOW()) WHERE id_motorista = ?",
          [phone, cleanCpf, cnh, cnhExpiration, decoded.photoURL || null, driverId]
        );
      } else {
        // Insert new record as PENDING_VERIFICATION (status 1)
        const [result]: any = await pool.execute(
          "INSERT INTO tb_motorista (nm_mot, ds_email, ds_telefone, nu_mot_cpf, nu_mot_cnh, dt_mot_cnh_val, ds_google_foto, id_status, fl_verificado, fl_ativo, id_empresa, dt_cadastro) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())",
          [decoded.name, decoded.email, phone, cleanCpf, cnh, cnhExpiration, decoded.photoURL || null, 1, 0, 1]
        );
        driverId = result.insertId;
      }

      // Update cookie to a standard session token (without registerRequired)
      const sessionToken = jwt.sign(
        { email: decoded.email, name: decoded.name, id: driverId }, 
        JWT_SECRET, 
        { expiresIn: "7d" }
      );
      res.cookie("session", sessionToken, { 
        secure: true, 
        sameSite: "none", 
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 
      });

      // In real life, send email here. For simulation, we provide the link to follow.
      const verificationToken = jwt.sign({ email: decoded.email }, JWT_SECRET, { expiresIn: '24h' });
      const baseUrl = getAppBaseUrl(req);
      const verifyLink = `${baseUrl}/api/auth/verify?token=${verificationToken}`;
      
      const emailSent = await sendVerificationEmail(decoded.email, decoded.name, verifyLink);
      
      console.log(`[AUTH] Verification link for ${decoded.email}: ${verifyLink} (Email sent: ${emailSent})`);

      res.json({ 
        success: true, 
        message: emailSent ? "Cadastro solicitado. Verifique seu e-mail." : "Cadastro solicitado, mas houve erro ao enviar o e-mail. Use o link abaixo ou configure o SMTP.", 
        verifyLink 
      });
    } catch (e: any) {
      console.error("[AUTH] Registration error:", e);
      res.status(400).json({ error: `Registration failed: ${e.message || 'Unknown error'}` });
    }
  });

  app.post("/api/auth/resend-verification", async (req, res) => {
    const token = req.cookies.session;
    if (!token) return res.status(401).json({ error: "Sessão expirada" });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const [rows]: any = await pool.execute("SELECT nm_mot, id_status FROM tb_motorista WHERE ds_email = ?", [decoded.email]);
      
      if (rows.length === 0) return res.status(404).json({ error: "Usuário não encontrado" });
      if (rows[0].id_status !== 1) return res.status(400).json({ error: "Status não permite reenvio" });

      const verificationToken = jwt.sign({ email: decoded.email }, JWT_SECRET, { expiresIn: '24h' });
      const baseUrl = getAppBaseUrl(req);
      const verifyLink = `${baseUrl}/api/auth/verify?token=${verificationToken}`;
      
      const emailSent = await sendVerificationEmail(decoded.email, rows[0].nm_mot, verifyLink);
      
      if (emailSent) {
        res.json({ message: "E-mail reenviado com sucesso!" });
      } else {
        res.status(500).json({ error: "Erro ao enviar e-mail. Verifique se o SMTP está configurado." });
      }
    } catch (e) {
      res.status(401).json({ error: "Token inválido" });
    }
  });

  app.get("/api/auth/verify", async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).send("Token faltante");

    try {
      const decoded: any = jwt.verify(token as string, JWT_SECRET);
      await pool.execute(
        "UPDATE tb_motorista SET id_status = 2, fl_verificado = 1 WHERE ds_email = ?",
        [decoded.email]
      );

      res.send(`
        <body style="background:#0a0a0a; color:white; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh;">
          <div style="text-align:center;">
            <h1>E-mail Verificado!</h1>
            <p>Seu cadastro passará por aprovação manual dos administradores.</p>
            <p>Você pode fechar esta aba agora.</p>
          </div>
        </body>
      `);
    } catch (e) {
      res.status(400).send("Token inválido ou expirado");
    }
  });

  app.get("/api/admin/pending-users", async (req, res) => {
    const token = req.cookies.session;
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const isAdmin = await checkIsAdmin(decoded.email);
      if (!isAdmin) return res.status(403).json({ error: "Access denied" });

      const [rows] = await pool.execute(
        "SELECT id_motorista, nm_mot, ds_email, ds_telefone, nu_mot_cpf, nu_mot_cnh, dt_mot_cnh_val, dt_cadastro FROM tb_motorista WHERE id_status = 2 AND fl_verificado = 1"
      );
      res.json(rows);
    } catch (e) {
      res.status(401).json({ error: "Unauthorized" });
    }
  });

  app.post("/api/admin/approve-user", async (req, res) => {
    const token = req.cookies.session;
    const { userId, approve } = req.body;
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const isAdmin = await checkIsAdmin(decoded.email);
      if (!isAdmin) return res.status(403).json({ error: "Access denied" });

      const status = approve ? 'AUTHORIZED' : 'REJECTED';
      const statusNum = approve ? 3 : 0; // 0 for REJECTED, 3 for AUTHORIZED
      await pool.execute(
        "UPDATE tb_motorista SET id_status = ? WHERE id_motorista = ?",
        [statusNum, userId]
      );

      if (approve) {
        const [rows] = await pool.execute("SELECT nm_mot, ds_email FROM tb_motorista WHERE id_motorista = ?", [userId]);
        const driver = (rows as any[])[0];
        if (driver) {
          await sendApprovalEmail(driver.ds_email, driver.nm_mot);
        }
      }

      res.json({ success: true });
    } catch (e) {
      res.status(401).json({ error: "Unauthorized" });
    }
  });

  async function executeAnpSync() {
    console.log("[CRON] Starting ANP sync script in --json-only mode...");
    const envObj = {
      ...process.env,
      DB_HOST: process.env.DB_HOST || "129.146.31.117",
      DB_USER: process.env.DB_USER || "root",
      DB_PASSWORD: process.env.DB_PASSWORD || "nRGboHgFC7PkD9",
      DB_NAME: process.env.DB_NAME || "encheotanque"
    };

    // Run python3 script in client-side secure JSON only mode (avoids PyMySQL dependency on server container)
    const { stdout, stderr } = await execAsync("python3 sync_anp_prices.py --json-only", { env: envObj });
    
    let itemsList: any[] = [];
    try {
      itemsList = JSON.parse(stdout);
    } catch (e: any) {
      throw new Error(`Failed to parse sync JSON output. Error: ${e.message}. Python output: ${stdout}`);
    }

    console.log(`[CRON] Parsed ${itemsList.length} unique CSV prices. Commencing database synchronization in Node...`);

    // Load tb_tipoproduto for mapping
    const [fuelsRows]: any = await pool.execute("SELECT id_produto, ds_produto FROM tb_tipoproduto");
    
    const PRODUCT_ALIASES: Record<string, string> = {
      "GASOLINA": "GASOLINA C COMUM",
      "GASOLINA COMUM": "GASOLINA C COMUM",
      "GASOLINA C COMUM": "GASOLINA C COMUM",
      "GASOLINA ADITIVADA": "GASOLINA C COMUM ADITIVADA",
      "GASOLINA C ADITIVADA": "GASOLINA C COMUM ADITIVADA",
      "ETANOL": "ETANOL HIDRATADO COMUM",
      "ETANOL HIDRATADO": "ETANOL HIDRATADO COMUM",
      "ETANOL HIDRATADO COMUM": "ETANOL HIDRATADO COMUM",
      "ETANOL ADITIVADO": "ETANOL HIDRATADO ADITIVADO",
      "ETANOL HIDRATADO ADITIVADO": "ETANOL HIDRATADO ADITIVADO",
      "DIESEL S10": "ÓLEO DIESEL B S10 - COMUM",
      "DIESEL B S10": "ÓLEO DIESEL B S10 - COMUM",
      "OLEO DIESEL B S10": "ÓLEO DIESEL B S10 - COMUM",
      "ÓLEO DIESEL B S10 - COMUM": "ÓLEO DIESEL B S10 - COMUM",
      "DIESEL S10 ADITIVADO": "ÓLEO DIESEL B S10 - ADITIVADO",
      "ÓLEO DIESEL B S10 - ADITIVADO": "ÓLEO DIESEL B S10 - ADITIVADO",
      "DIESEL S500": "ÓLEO DIESEL B S500 - COMUM",
      "DIESEL B S500": "ÓLEO DIESEL B S500 - COMUM",
      "OLEO DIESEL B S500": "ÓLEO DIESEL B S500 - COMUM",
      "ÓLEO DIESEL B S500 - COMUM": "ÓLEO DIESEL B S500 - COMUM",
      "GNV": "GÁS NATURAL VEICULAR",
      "GAS NATURAL VEICULAR": "GÁS NATURAL VEICULAR",
      "GÁS NATURAL VEICULAR": "GÁS NATURAL VEICULAR"
    };

    const removeAccents = (str: string) => {
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    const normalizeStr = (str: string) => {
      if (!str) return "";
      return removeAccents(str).toUpperCase().trim();
    };

    // Map db products for reverse lookup and name resolution
    const dbProducts = new Map<string, number>();
    const productNames = new Map<number, string>();
    for (const row of fuelsRows) {
      const normDs = normalizeStr(row.ds_produto);
      dbProducts.set(normDs, row.id_produto);
      productNames.set(row.id_produto, row.ds_produto);
      
      // Also map standard aliases if we match them in database
      if (PRODUCT_ALIASES[normDs]) {
        dbProducts.set(normalizeStr(PRODUCT_ALIASES[normDs]), row.id_produto);
      }
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let ignoredOlderCount = 0;
    let ignoredMissingPosto = 0;
    let ignoredMissingProd = 0;

    const missingCnpjsSet = new Set<string>();
    const missingProductsMap = new Map<string, number>();
    const insertedPostos = new Map<string, { cnpj: string; nm_posto: string; address: string; municipio: string; brand: string }>();

    const postosCache = new Map<string, { id_posto: number; nm_posto: string } | null>();
    const updatedDetails: Array<{
      nm_posto: string;
      ds_produto: string;
      price: string;
      date: string;
      action: "Inserido" | "Atualizado";
    }> = [];

    for (const item of itemsList) {
      const cnpj = item.cnpj;
      const productRaw = item.product;
      const csvPrice = item.price;
      const csvDateStr = item.date; // "YYYY-MM-DD"
      const csvDate = new Date(csvDateStr);

      // A. Resolve id_posto by CNPJ (check nu_cnpjposto)
      let id_posto: number | null = null;
      let nm_posto = "";
      if (postosCache.has(cnpj)) {
        const cached = postosCache.get(cnpj);
        if (cached) {
          id_posto = cached.id_posto;
          nm_posto = cached.nm_posto;
        }
      } else {
        try {
          const [rows]: any = await pool.execute(
            "SELECT id_posto, nm_posto FROM tb_postos WHERE nu_cnpjposto = ? LIMIT 1",
            [cnpj]
          );
          if (rows && rows.length > 0) {
            id_posto = rows[0].id_posto;
            nm_posto = rows[0].nm_posto;
            postosCache.set(cnpj, { id_posto, nm_posto });
          } else {
            postosCache.set(cnpj, null);
          }
        } catch (e) {
          console.error(`[CRON] Error querying posto for CNPJ ${cnpj}:`, e);
          postosCache.set(cnpj, null);
        }
      }

      if (!id_posto) {
        try {
          const rawCnpj = cnpj.replace(/\D/g, "").padStart(14, '0').substring(0, 14);
          const cleanCep = (item.cep || "").replace(/\D/g, "").substring(0, 8).padStart(8, '0');
          const finalNmPosto = (item.revenda || "POSTO AUTOMÁTICO").trim().toUpperCase().substring(0, 100);
          const finalRua = (item.endereco_rua || "").trim().toUpperCase();
          const finalNum = (item.numero_rua || "").trim();
          const finalAddress = `${finalRua}, ${finalNum}`.replace(/(,\s*)+$/, "").trim().toUpperCase().substring(0, 200) || "ENDEREÇO NÃO EXTRAÍDO";
          const finalComplemento = (item.complemento || "").trim().toUpperCase().substring(0, 500);
          const finalBairro = (item.bairro || "CENTRO").trim().toUpperCase().substring(0, 50);
          const finalUf = (item.uf || "RJ").trim().toUpperCase().substring(0, 2);
          const finalMunicipio = (item.municipio || "RIO DE JANEIRO").trim().substring(0, 200);
          const finalBandeira = (item.bandeira || "BRANCA").trim().toUpperCase().substring(0, 50);

          const [insertRes]: any = await pool.execute(
            `INSERT INTO tb_postos 
             (nu_cnpjposto, nu_autorizacaoanp, nm_posto, ds_endereco, ds_complemento, nm_bairro, nu_cep, sg_ufposto, nm_municipio, geo_latitude, geo_longitude, nm_bandeira, fl_ativo)
             VALUES (?, 'PENDENTE', ?, ?, ?, ?, ?, ?, ?, '0', '0', ?, 1)`,
            [rawCnpj, finalNmPosto, finalAddress, finalComplemento, finalBairro, cleanCep, finalUf, finalMunicipio, finalBandeira]
          );

          id_posto = (insertRes as any).insertId;
          nm_posto = finalNmPosto;
          postosCache.set(cnpj, { id_posto, nm_posto });

          insertedPostos.set(cnpj, {
            cnpj,
            nm_posto: finalNmPosto,
            address: finalAddress,
            municipio: finalMunicipio,
            brand: finalBandeira
          });

          console.log(`[CRON] Realizada auto-inserção do posto CNPJ ${cnpj} - ${finalNmPosto}`);
        } catch (insertError: any) {
          console.error(`[CRON] Erro ao tentar auto-inserir posto CNPJ ${cnpj}:`, insertError);
          ignoredMissingPosto++;
          missingCnpjsSet.add(cnpj);
          continue;
        }
      }

      // B. Resolve id_combustivel (id_produto) matching normalized CSV names
      const prodNorm = normalizeStr(productRaw);
      const mappedName = PRODUCT_ALIASES[prodNorm] || prodNorm;
      let id_combustivel = dbProducts.get(normalizeStr(mappedName));

      if (!id_combustivel) {
        // If no exact match, fallback to partial matches
        for (const [normKey, id_p] of dbProducts.entries()) {
          if (normKey.includes(prodNorm) || prodNorm.includes(normKey)) {
            id_combustivel = id_p;
            break;
          }
        }
      }

      if (!id_combustivel) {
        ignoredMissingProd++;
        missingProductsMap.set(productRaw, (missingProductsMap.get(productRaw) || 0) + 1);
        continue;
      }

      // C. Check database for existing price for this station and fuel
      const [precosRows]: any = await pool.execute(
        "SELECT dt_ultima_atualizacao, vl_preco_venda FROM tb_precos_combustiveis WHERE id_posto = ? AND id_produto = ?",
        [id_posto, id_combustivel]
      );

      let shouldUpdate = false;
      let isNewEntry = false;

      if (precosRows && precosRows.length > 0) {
        const dbRow = precosRows[0];
        const dbDate = dbRow.dt_ultima_atualizacao;
        if (dbDate) {
          // Adjust to JS Date for comparison
          const parsedDbDate = new Date(dbDate);
          if (csvDate > parsedDbDate) {
            shouldUpdate = true;
          } else {
            ignoredOlderCount++;
          }
        } else {
          shouldUpdate = true;
        }
      } else {
        shouldUpdate = true;
        isNewEntry = true;
      }

      // D. Sync database table
      if (shouldUpdate) {
        const productName = productNames.get(id_combustivel) || productRaw;
        if (isNewEntry) {
          await pool.execute(
            `INSERT INTO tb_precos_combustiveis 
             (id_posto, id_produto, vl_preco_venda, dt_ultima_atualizacao, ds_origem_dado)
             VALUES (?, ?, ?, ?, ?)`,
            [id_posto, id_combustivel, csvPrice, csvDate, 'CSV_TANKAGE_SYNC']
          );
          insertedCount++;
          updatedDetails.push({
            nm_posto,
            ds_produto: productName,
            price: csvPrice,
            date: csvDateStr,
            action: "Inserido"
          });
        } else {
          await pool.execute(
            `UPDATE tb_precos_combustiveis
             SET vl_preco_venda = ?, dt_ultima_atualizacao = ?, ds_origem_dado = ?
             WHERE id_posto = ? AND id_produto = ?`,
            [csvPrice, csvDate, 'CSV_TANKAGE_SYNC', id_posto, id_combustivel]
          );
          updatedCount++;
          updatedDetails.push({
            nm_posto,
            ds_produto: productName,
            price: csvPrice,
            date: csvDateStr,
            action: "Atualizado"
          });
        }
      }
    }

    // Retrieve database statistics totals
    let totalPostos = 792;
    let totalFuels = 11;
    try {
      const [pRows]: any = await pool.execute("SELECT COUNT(*) as total FROM tb_postos");
      if (pRows && pRows[0] && pRows[0].total !== undefined) totalPostos = pRows[0].total;
      const [fRows]: any = await pool.execute("SELECT COUNT(*) as total FROM tb_tipoproduto");
      if (fRows && fRows[0] && fRows[0].total !== undefined) totalFuels = fRows[0].total;
    } catch (e) {
      console.error("[CRON] Error querying database totals:", e);
    }
    const totalPares = totalPostos * totalFuels;
    const missingFuelsPct = totalPares > 0 ? ((ignoredMissingProd / totalPares) * 100).toFixed(2) : "0.00";

    // Retrieve admins and send email report
    const adminEmails = new Set<string>([
      "marcio.vasconcellos@gmail.com",
      "afonsogwinter@gmail.com",
      "encheotanqueucp@gmail.com"
    ]);

    try {
      const [contatosRows]: any = await pool.execute(
        "SELECT ds_email FROM tb_empresa_contato WHERE fl_ativo = 1 AND tp_contato = 'A'"
      );
      for (const row of contatosRows) {
        if (row.ds_email) {
          adminEmails.add(row.ds_email.toLowerCase().trim());
        }
      }
    } catch (e) {
      console.error("[CRON] Error retrieving admin emails from database:", e);
    }

    if (process.env.SMTP_USER && process.env.SMTP_PASS && adminEmails.size > 0) {
      console.log(`[CRON] Pre-processing email report to ${adminEmails.size} admins...`);
      
      const limitDetails = updatedDetails.slice(0, 100);
      const rowsHtml = limitDetails.length > 0 
        ? limitDetails.map(item => `
          <tr style="border-bottom: 1px solid #eeeeee;">
            <td style="padding: 10px; font-weight: bold; color: #333333; font-family: sans-serif; font-size: 13px;">${item.nm_posto}</td>
            <td style="padding: 10px; color: #555555; font-family: sans-serif; font-size: 13px;">${item.ds_produto}</td>
            <td style="padding: 10px; font-weight: bold; color: #16a34a; font-family: sans-serif; font-size: 13px;">R$ ${item.price}</td>
            <td style="padding: 10px; color: #666666; font-family: sans-serif; font-size: 13px;">${item.date}</td>
            <td style="padding: 10px;">
              <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; font-family: sans-serif; ${
                item.action === 'Inserido' ? 'background-color: #dcfce7; color: #166534;' : 'background-color: #dbeafe; color: #1e40af;'
              }">${item.action}</span>
            </td>
          </tr>
        `).join("")
        : `
          <tr>
            <td colspan="5" style="padding: 20px; text-align: center; color: #64748b; font-style: italic; font-family: sans-serif;">
              Todos os preços processados do repositório da ANP já estão atualizados em nossa base. Nenhuma nova inclusão ou alteração foi necessária neste lote.
            </td>
          </tr>
        `;

      const truncationHtml = updatedDetails.length > 100 
        ? `<tr style="background-color: #fafafa;"><td colspan="5" style="padding: 12px; text-align: center; color: #555555; font-style: italic; font-family: sans-serif;">...e mais ${updatedDetails.length - 100} preços sincronizados foram suprimidos do e-mail.</td></tr>`
        : "";

      // Render auto-inserted postos
      let insertedPostosHtml = "";
      if (insertedPostos.size > 0) {
        insertedPostosHtml = `
          <div style="margin-top: 20px; background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 4px;">
            <h4 style="margin: 0 0 8px 0; color: #065f46; font-size: 14px; font-family: sans-serif; font-weight: bold;">🎉 Postos Auto-Inseridos via CSV (${insertedPostos.size} novos)</h4>
            <p style="margin: 0 0 10px 0; font-size: 12px; color: #065f46; font-family: sans-serif;">Os seguintes postos vieram nas planilhas do CSV e foram cadastrados de forma automatizada no banco de dados. <strong>Favor completar o cadastro com as coordenadas de latitude/longitude e código de autorização ANP</strong>:</p>
            <div style="overflow-x: auto; background-color: #ffffff; border: 1px solid #d1fae5; border-radius: 4px;">
              <table style="width: 100%; font-size: 11px; border-collapse: collapse; font-family: sans-serif; text-align: left;">
                <thead>
                  <tr style="background-color: #f0fdf4; border-bottom: 2px solid #bbf7d0; color: #065f46; font-weight: bold;">
                    <th style="padding: 8px; font-family: sans-serif;">CNPJ</th>
                    <th style="padding: 8px; font-family: sans-serif;">Nome Fantasia / Revenda</th>
                    <th style="padding: 8px; font-family: sans-serif;">Endereço</th>
                    <th style="padding: 8px; font-family: sans-serif;">Bandeira</th>
                    <th style="padding: 8px; font-family: sans-serif; text-align: right;">Coordenadas</th>
                  </tr>
                </thead>
                <tbody>
                  ${Array.from(insertedPostos.values()).map(p => `
                    <tr style="border-bottom: 1px solid #f0fdf4;">
                      <td style="padding: 8px; color: #065f46; font-family: monospace;">${p.cnpj}</td>
                      <td style="padding: 8px; color: #065f46; font-weight: bold;">${p.nm_posto}</td>
                      <td style="padding: 8px; color: #065f46;">${p.address} (${p.municipio})</td>
                      <td style="padding: 8px; color: #065f46;">${p.brand}</td>
                      <td style="padding: 8px; color: #ef4444; text-align: right; font-weight: bold;">[PENDENTE]</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      // Render custom lists for missing items
      let missingCnpjsHtml = "";
      if (missingCnpjsSet.size > 0) {
        missingCnpjsHtml = `
          <div style="margin-top: 20px; background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 4px;">
            <h4 style="margin: 0 0 8px 0; color: #991b1b; font-size: 14px; font-family: sans-serif;">🚨 CNPJs sem Posto Correspondente no Banco (${missingCnpjsSet.size} distintos)</h4>
            <p style="margin: 0 0 10px 0; font-size: 12px; color: #7f1d1d; font-family: sans-serif;">Os seguintes CNPJs de postos vieram nas planilhas oficiais da ANP mas não foram localizados na nossa tabela <code>tb_postos</code>. Adicione-os aos cadastros para capturar as coletas futuras:</p>
            <div style="max-height: 120px; overflow-y: auto; background-color: #ffffff; border: 1px solid #fee2e2; padding: 10px; border-radius: 4px;">
              <code style="font-size: 11px; color: #b91c1c; font-family: monospace; display: block; word-break: break-all; line-height: 1.5;">
                ${Array.from(missingCnpjsSet).join(" &bull; ")}
              </code>
            </div>
          </div>
        `;
      }

      let missingFuelsHtml = "";
      if (missingProductsMap.size > 0) {
        const sortedFuels = Array.from(missingProductsMap.entries()).sort((a,b) => b[1] - a[1]);
        missingFuelsHtml = `
          <div style="margin-top: 20px; background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px;">
            <h4 style="margin: 0 0 8px 0; color: #92400e; font-size: 14px; font-family: sans-serif;">⚠️ Combustíveis sem Mapeamento</h4>
            <p style="margin: 0 0 10px 0; font-size: 12px; color: #78350f; font-family: sans-serif;">As seguintes designações nas planilhas da ANP não coincidem com as cadastradas em nossa <code>tb_tipoproduto</code>:</p>
            <table style="width: 100%; font-size: 11px; border-collapse: collapse; font-family: sans-serif;">
              <thead>
                <tr style="border-bottom: 1px solid #fde68a; color: #78350f; font-weight: bold; text-align: left;">
                  <th style="padding: 4px 0;">Descrição ANP</th>
                  <th style="padding: 4px 0; text-align: right;">Ocorrências no Lote</th>
                </tr>
              </thead>
              <tbody>
                ${sortedFuels.map(([name, count]) => `
                  <tr style="border-bottom: 1px solid #fef3c7;">
                    <td style="padding: 4px 0; color: #92400e; font-family: monospace;">${name}</td>
                    <td style="padding: 4px 0; color: #92400e; text-align: right; font-weight: bold;">${count}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        `;
      }

      const emailHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; padding: 30px; font-size: 14px; line-height: 1.6; color: #222222;">
          <div style="max-width: 700px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #e1e4e8;">
            <div style="background-color: #006A38; color: #ffffff; padding: 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold; font-family: sans-serif;">Relatório de Sincronização ANP</h1>
              <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px; font-family: sans-serif;">Rotina Automática de Atualização de Preços</p>
            </div>
            
            <div style="padding: 30px;">
              <p style="font-size: 16px; margin-top: 0; font-family: sans-serif;">Olá, Administrador,</p>
              <p style="font-family: sans-serif;">A sincronização diária com o repositório oficial da ANP foi executada. Abaixo está o resumo consolidado das atualizações em nosso banco de dados:</p>
              
              <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 16px; border-radius: 4px; margin: 20px 0;">
                <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 15px; font-family: sans-serif;">Resumo dos Dados</h3>
                <table style="width: 100%; border-collapse: collapse; font-family: sans-serif;">
                  <tr>
                    <td style="padding: 6px 0; color: #475569; width: 60%;">Novos Preços Adicionados:</td>
                    <td style="padding: 6px 0; font-weight: bold; color: #0284c7;">${insertedCount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #475569;">Preços Atualizados (Novos Valores):</td>
                    <td style="padding: 6px 0; font-weight: bold; color: #16a34a;">${updatedCount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #475569;">Ignorados (Já Atualizados/Mais Antigos):</td>
                    <td style="padding: 6px 0; font-weight: bold; color: #64748b;">${ignoredOlderCount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #475569;">Total Processado da ANP:</td>
                    <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${itemsList.length}</td>
                  </tr>
                  
                  <tr style="border-top: 1px dashed #e2e8f0;">
                    <td style="padding: 8px 0 6px 0; color: #475569;">Total de Postos Cadastrados no Banco:</td>
                    <td style="padding: 8px 0 6px 0; font-weight: bold; color: #0f172a;">${totalPostos}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #475569;">Total de Combustíveis Cadastrados:</td>
                    <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${totalFuels}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #475569;">Total Teórico de Pares Cadastrados:</td>
                    <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${totalPares}</td>
                  </tr>
                  
                  <tr style="border-top: 1px dotted #e2e8f0;">
                    <td style="padding: 8px 0 6px 0; color: #ef4444; font-weight: bold;">CNPJs sem posto correspondente:</td>
                    <td style="padding: 8px 0 6px 0; font-weight: bold; color: #ef4444;">${ignoredMissingPosto}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #f59e0b; font-weight: bold;">Combustíveis sem mapeamento:</td>
                    <td style="padding: 6px 0; font-weight: bold; color: #f59e0b;">${ignoredMissingProd} <span style="font-size: 11px; font-weight: normal; color: #64748b;">(${missingFuelsPct}% de mapeamento teórico)</span></td>
                  </tr>
                </table>
              </div>

              ${insertedPostosHtml}

              ${missingCnpjsHtml}

              ${missingFuelsHtml}
              
              <h2 style="font-size: 16px; color: #0f172a; margin: 30px 0 12px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-family: sans-serif;">Histórico Detalhado do Lote (Até 100 registros)</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #eeeeee;">
                <thead>
                  <tr style="background-color: #f8fafc; border-bottom: 2px solid #dddddd; text-align: left;">
                    <th style="padding: 10px; font-family: sans-serif;">Posto</th>
                    <th style="padding: 10px; font-family: sans-serif;">Combustível</th>
                    <th style="padding: 10px; font-family: sans-serif;">Valor</th>
                    <th style="padding: 10px; font-family: sans-serif;">Data Coleta</th>
                    <th style="padding: 10px; font-family: sans-serif;">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                  ${truncationHtml}
                </tbody>
              </table>
              
              <p style="margin-top: 30px; font-family: sans-serif;">O painel interativo já reflete as novas informações disponíveis para a comunidade e usuários.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.APP_URL || 'https://www.encheotanque.net.br'}" style="background-color: #006A38; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-family: sans-serif;">Acessar o Painel Administrativo</a>
              </div>
            </div>
            
            <div style="background-color: #fafbfc; border-top: 1px solid #e1e4e8; padding: 16px; text-align: center; font-size: 11px; color: #666666; font-family: sans-serif;">
              <p style="margin: 0;">Este email foi gerado de forma automatizada pelo servidor de Enche o Tanque.</p>
              <p style="margin: 4px 0 0 0;">© 2026 Enche o Tanque. Todos os direitos resonators.</p>
            </div>
          </div>
        </div>
      `;

      try {
        const mailOptions = {
          from: `"Enche o Tanque" <${process.env.SMTP_USER}>`,
          to: Array.from(adminEmails).join(", "),
          subject: `[Painel ANP] Sincronização Diária de Preços - ${new Date().toLocaleDateString('pt-BR')}`,
          html: emailHtml
        };
        await transporter.sendMail(mailOptions);
        console.log(`[CRON] Sync email report sent to ${adminEmails.size} administrators successfully!`);
      } catch (err: any) {
        console.error("[CRON] Failed sending sync email report:", err);
      }
    }

    return {
      success: true,
      stats: {
        inserted: insertedCount,
        updated: updatedCount,
        ignoredOlder: ignoredOlderCount,
        ignoredMissingPosto,
        ignoredMissingProd,
        autoInsertedPostos: insertedPostos.size,
        totalProcessed: itemsList.length
      },
      stderr: stderr || null
    };
  }

  // Define daily automatic cron job to execute at 3:00 AM local time
  cron.schedule("0 3 * * *", async () => {
    console.log("[CRON] Executando Sincronização Automática Diária ANP às", new Date().toLocaleString());
    try {
      const result = await executeAnpSync();
      console.log("[CRON] Sincronização Automática Diária ANP finalizada com sucesso!", JSON.stringify(result.stats));
    } catch (err: any) {
      console.error("[CRON] Erro na Sincronização Automática Diária ANP:", err.message);
    }
  });

  // Define daily automatic cron job for postos and tancagem to execute at 2:00 AM local time
  cron.schedule("0 2 * * *", async () => {
    console.log("[CRON] Executando Sincronização Automática Diária de Postos e Tancagem ANP às", new Date().toLocaleString());
    try {
      const result = await runAnpTancagemSync();
      if (result.success) {
        console.log("[CRON] Sincronização Automática Diária de Postos e Tancagem ANP finalizada com sucesso!", JSON.stringify(result.stats));
      } else {
        console.error("[CRON] Sincronização Automática Diária de Postos e Tancagem ANP falhou:", result.error);
      }
    } catch (err: any) {
      console.error("[CRON] Erro inesperado na Sincronização Automática Diária de Postos e Tancagem ANP:", err.message);
    }
  });

  app.all("/api/admin/sync-anp-prices", async (req, res) => {
    const syncKeyHeader = req.headers["x-sync-key"];
    const expectedSyncKey = process.env.SYNC_KEY || "enche-o-tanque-sync-key";

    let isAuthorized = false;

    if (syncKeyHeader && syncKeyHeader === expectedSyncKey) {
      isAuthorized = true;
    } else {
      const token = req.cookies.session;
      if (token) {
        try {
          const decoded: any = jwt.verify(token, JWT_SECRET);
          const isAdmin = await checkIsAdmin(decoded.email);
          if (isAdmin) {
            isAuthorized = true;
          }
        } catch (e) {
          // Token invalid
        }
      }
    }

    if (!isAuthorized) {
      return res.status(401).json({ error: "Unauthorized. For cron, provide X-Sync-Key header." });
    }

    try {
      const result = await executeAnpSync();
      res.json({
        success: true,
        message: "ANP Sincronização executada com sucesso via Node.js!",
        stats: result.stats,
        pythonStderr: result.stderr
      });
    } catch (error: any) {
      console.error("[CRON] Error during ANP Sync execution on-demand:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Erro desconhecido ao executar script de sincronização",
        output: error.stdout || "",
        warnings: error.stderr || ""
      });
    }
  });

  app.all("/api/admin/sync-anp-tancagem", async (req, res) => {
    const syncKeyHeader = req.headers["x-sync-key"];
    const expectedSyncKey = process.env.SYNC_KEY || "enche-o-tanque-sync-key";

    let isAuthorized = false;

    if (syncKeyHeader && syncKeyHeader === expectedSyncKey) {
      isAuthorized = true;
    } else {
      const token = req.cookies.session;
      if (token) {
        try {
          const decoded: any = jwt.verify(token, JWT_SECRET);
          const isAdmin = await checkIsAdmin(decoded.email);
          if (isAdmin) {
            isAuthorized = true;
          }
        } catch (e) {
          // Token invalid
        }
      }
    }

    if (!isAuthorized) {
      return res.status(401).json({ error: "Unauthorized. For cron, provide X-Sync-Key header." });
    }

    try {
      const dryRun = req.query.dryRun === "true" || req.body?.dryRun === true;
      console.log(`[WEB_API] Executando sincronização manual on-demand de postos e tancagem (dryRun: ${dryRun})...`);
      const result = await runAnpTancagemSync(dryRun);
      res.json({
        success: result.success,
        message: result.success 
          ? (dryRun ? "Simulação de Sincronização executada com sucesso! (Nenhum dado alterado)" : "Sincronização de Postos e Tancagem executada com sucesso!") 
          : "Sincronização concluída com erros ou pendências.",
        stats: result.stats,
        error: result.error || null
      });
    } catch (error: any) {
      console.error("[WEB_API] Error during manual ANP Tancagem Sync:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Erro desconhecido ao executar sincronização de tancagem"
      });
    }
  });

  app.post("/api/profile/update-picture", async (req, res) => {
    const token = req.cookies.session;
    const { photo } = req.body;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      await pool.execute(
        "UPDATE tb_motorista SET ds_foto = ? WHERE ds_email = ?",
        [photo, decoded.email]
      );
      res.json({ success: true });
    } catch (e) {
      console.error("[PROFILE] Error updating picture:", e);
      res.status(500).json({ error: "Erro ao atualizar foto" });
    }
  });

  app.post("/api/profile/update-preferences", async (req, res) => {
    const token = req.cookies.session;
    const { preferredFuel, searchRadius } = req.body;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      await pool.execute(
        "UPDATE tb_motorista SET id_combustivel_pref = ?, nu_raio_busca_pref = ? WHERE ds_email = ?",
        [preferredFuel, searchRadius, decoded.email]
      );
      res.json({ success: true });
    } catch (e) {
      console.error("[PROFILE] Error updating preferences:", e);
      res.status(500).json({ error: "Erro ao atualizar preferências" });
    }
  });

  app.post("/api/profile/update", async (req, res) => {
    const token = req.cookies.session;
    const { phone, cpf, cnh, cnhExpiration } = req.body;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const cleanCpf = cpf ? cpf.replace(/\D/g, '') : '';
      
      await pool.execute(
        "UPDATE tb_motorista SET ds_telefone = ?, nu_mot_cpf = ?, nu_mot_cnh = ?, dt_mot_cnh_val = ? WHERE ds_email = ?",
        [phone, cleanCpf, cnh, cnhExpiration, decoded.email]
      );
      
      res.json({ success: true });
    } catch (e) {
      console.error("[PROFILE] Error updating:", e);
      res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
  });

  app.post("/api/vehicle/add", async (req, res) => {
    const token = req.cookies.session;
    const { plate, renavam, model, brand, preferredFuel, allowedFuels } = req.body;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const [rows] = await pool.execute("SELECT id_motorista FROM tb_motorista WHERE ds_email = ?", [decoded.email]);
      const driver = (rows as any[])[0];

      if (!driver) {
        return res.status(403).json({ error: "Motorista não encontrado" });
      }

      const cleanRenavam = renavam ? renavam.replace(/\D/g, '').substring(0, 11) : '';
      const cleanPlate = plate ? plate.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
      const allowedFuelsStr = Array.isArray(allowedFuels) ? allowedFuels.join(',') : '';

      await pool.execute(
        "INSERT INTO tb_veiculo (id_motorista, id_placa, nu_renavam, nm_modelo, nm_marca, fl_ativo, id_comb_pref, ds_combs_permitidos) VALUES (?, ?, ?, ?, ?, 1, ?, ?)",
        [driver.id_motorista, cleanPlate, cleanRenavam, model || 'Não informado', brand || 'Não informado', preferredFuel || null, allowedFuelsStr]
      );

      res.json({ success: true });
    } catch (e: any) {
       console.error("[VEHICLE_ADD] Error:", e);
       res.status(500).json({ error: "Falha ao adicionar veículo: " + e.message });
    }
  });

  app.post("/api/vehicle/update-fuels", async (req, res) => {
    const token = req.cookies.session;
    const { id_veiculo, preferredFuel, allowedFuels } = req.body;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const allowedFuelsStr = Array.isArray(allowedFuels) ? allowedFuels.join(',') : '';
      
      await pool.execute(
        "UPDATE tb_veiculo v JOIN tb_motorista m ON v.id_motorista = m.id_motorista SET v.id_comb_pref = ?, v.ds_combs_permitidos = ? WHERE v.id_veiculo = ? AND m.ds_email = ?",
        [preferredFuel, allowedFuelsStr, id_veiculo, decoded.email]
      );
      res.json({ success: true });
    } catch (e: any) {
      console.error("[VEHICLE_UPDATE_FUELS] Error:", e);
      res.status(500).json({ error: "Erro ao atualizar combustíveis: " + e.message });
    }
  });

  const isVehicleFipeCompliant = (brand: string, model: string) => {
    const b = (brand || "").trim();
    const m = (model || "").trim();
    if (b.length < 2 || m.length < 2) return false;
    const lb = b.toLowerCase();
    const lm = m.toLowerCase();
    const forbidden = ["não informado", "nao informado", "n/a", "selecionar", "indefinido", "unknown", "teste", "test", "xxx", "yyy", "zzz", "abc", "123", "placeholder"];
    if (forbidden.some(term => lb.includes(term) || lm.includes(term))) return false;
    if (/(.)\1{2,}/.test(lb) || /(.)\1{2,}/.test(lm)) return false;
    if (b.includes("/")) return false;
    if (lb === lm && b.length < 8) return false;
    return true;
  };

  app.post("/api/vehicle/update", async (req, res) => {
    const token = req.cookies.session;
    const { id_veiculo, plate, renavam, model, brand } = req.body;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    if (!isVehicleFipeCompliant(brand, model)) {
      return res.status(400).json({ error: "Os dados de marca e modelo informados não seguem o padrão obrigatório FIPE. Por favor, utilize o seletor para buscar dados reais (Não use repetições como xxx)." });
    }

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const cleanRenavam = renavam ? renavam.replace(/\D/g, '').substring(0, 11) : '';
      const cleanPlate = plate ? plate.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
      
      await pool.execute(
        "UPDATE tb_veiculo v JOIN tb_motorista m ON v.id_motorista = m.id_motorista SET v.id_placa = ?, v.nu_renavam = ?, v.nm_modelo = ?, v.nm_marca = ? WHERE v.id_veiculo = ? AND m.ds_email = ?",
        [cleanPlate, cleanRenavam, model, brand, id_veiculo, decoded.email]
      );
      res.json({ success: true });
    } catch (e: any) {
      console.error("[VEHICLE_UPDATE] Error:", e);
      res.status(500).json({ error: "Erro ao atualizar veículo: " + e.message });
    }
  });

  // --- COMPANY CONFIGURATION ENDPOINTS ---
  app.get("/api/empresa/config", async (req, res) => {
    const token = req.cookies.session;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const companyId = await getCompanyIdForUser(decoded.email);

      // Fetch company details
      const [companies]: any = await pool.execute(
        "SELECT id_empresa, nu_emp_cnpj, nm_emp_razao, nm_emp_fantasia, fl_ativo FROM tb_empresa WHERE id_empresa = ?",
        [companyId]
      );

      if (companies.length === 0) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      const company = companies[0];

      // Fetch company contact emails filtered strictly by user's company using tb_empresa_contato
      const [contacts]: any = await pool.execute(
        "SELECT id_contato, nm_contato, ds_email, fl_ativo, tp_contato FROM tb_empresa_contato WHERE id_empresa = ?",
        [companyId]
      );

      const emailOptions = contacts.map((c: any) => ({
        email: c.ds_email,
        name: c.nm_contato || c.ds_email,
        isSelected: c.tp_contato === 'A'
      }));

      res.json({
        id_empresa: company.id_empresa,
        nu_emp_cnpj: company.nu_emp_cnpj,
        nm_emp_razao: company.nm_emp_razao,
        nm_emp_fantasia: company.nm_emp_fantasia,
        fl_ativo: company.fl_ativo,
        emailOptions: emailOptions
      });
    } catch (e: any) {
      console.error("[COMPANY_CONFIG] Error fetching config:", e);
      res.status(500).json({ error: "Erro ao carregar dados da empresa: " + e.message });
    }
  });

  app.post("/api/empresa/config", async (req, res) => {
    const token = req.cookies.session;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const { id_empresa, nu_emp_cnpj, nm_emp_razao, nm_emp_fantasia, selectedEmails } = req.body;

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const userCompanyId = await getCompanyIdForUser(decoded.email);

      const targetCompanyId = id_empresa ? parseInt(id_empresa) : userCompanyId;

      await pool.execute(
        "UPDATE tb_empresa SET nu_emp_cnpj = ?, nm_emp_razao = ?, nm_emp_fantasia = ? WHERE id_empresa = ?",
        [nu_emp_cnpj || "", nm_emp_razao || "", nm_emp_fantasia || "", targetCompanyId]
      );

      if (Array.isArray(selectedEmails)) {
        await pool.execute(
          "UPDATE tb_empresa_contato SET tp_contato = 'C', fl_ativo = 1 WHERE id_empresa = ?",
          [targetCompanyId]
        );

        for (const email of selectedEmails) {
          if (!email || typeof email !== 'string') continue;
          
          const cleanEmail = email.trim().toLowerCase();
          
          const [existing]: any = await pool.execute(
            "SELECT id_contato FROM tb_empresa_contato WHERE ds_email = ?",
            [cleanEmail]
          );

          if (existing.length > 0) {
            await pool.execute(
              "UPDATE tb_empresa_contato SET tp_contato = 'A', fl_ativo = 1, id_empresa = ? WHERE ds_email = ?",
              [targetCompanyId, cleanEmail]
            );
          } else {
            const [driverMatch]: any = await pool.execute(
              "SELECT nm_mot FROM tb_motorista WHERE ds_email = ?",
              [cleanEmail]
            );
            const contactName = driverMatch.length > 0 ? driverMatch[0].nm_mot : email.split('@')[0];

            await pool.execute(
              "INSERT INTO tb_empresa_contato (id_empresa, nm_contato, ds_email, fl_ativo, tp_contato) VALUES (?, ?, ?, 1, 'A')",
              [targetCompanyId, contactName, cleanEmail]
            );
          }
        }
      }

      res.json({ success: true, message: "Configurações da empresa salvas com sucesso!" });
    } catch (e: any) {
      console.error("[COMPANY_CONFIG_SAVE] Error saving config:", e);
      res.status(500).json({ error: "Erro ao salvar dados da empresa: " + e.message });
    }
  });

  app.post("/api/my-vehicle/setup", async (req, res) => {
    const token = req.cookies.session;
    const { plate, renavam, model, brand } = req.body;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    if (!isVehicleFipeCompliant(brand, model)) {
      return res.status(400).json({ error: "Os dados de marca e modelo informados não seguem o padrão obrigatório FIPE. Por favor, utilize o seletor para buscar dados reais (Não use repetições como xxx)." });
    }

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const [rows] = await pool.execute("SELECT id_motorista, id_status FROM tb_motorista WHERE ds_email = ?", [decoded.email]);
      const driver = (rows as any[])[0];

      if (!driver || driver.id_status !== 3) {
        return res.status(403).json({ error: "Account not approved" });
      }

      const cleanRenavam = renavam ? renavam.replace(/\D/g, '').substring(0, 11) : '';
      const cleanPlate = plate ? plate.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';

      await pool.execute(
        "INSERT INTO tb_veiculo (id_motorista, id_placa, nu_renavam, nm_modelo, nm_marca) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nu_renavam=VALUES(nu_renavam), nm_modelo=VALUES(nm_modelo), nm_marca=VALUES(nm_marca)",
        [driver.id_motorista, cleanPlate, cleanRenavam, model || 'Não informado', brand || 'Não informado']
      );

      res.json({ success: true });
    } catch (e: any) {
       console.error("[VEHICLE_SETUP] Error:", e);
       res.status(500).json({ error: "Failed to save vehicle: " + e.message });
    }
  });

  // --- VEHICLES & ABASTECIMENTOS ENDPOINTS FOR BACKOFFICE ---
  app.get("/api/empresa/vehicles", async (req, res) => {
    const token = req.cookies.session;
    let companyId: number = 1;

    if (req.query.companyId) {
      companyId = parseInt(req.query.companyId as string, 10);
    } else if (token) {
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        companyId = await getCompanyIdForUser(decoded.email);
      } catch (e) {
        console.warn("[GET_VEHICLES] JWT verify failed, fallback to companyId = 1");
      }
    }

    try {

      const [rows]: any = await pool.execute(
        `SELECT v.id_veiculo AS id, v.id_placa AS plate, v.nm_modelo AS model, v.nm_marca AS brand, m.nm_mot AS driverName,
                v.nu_renavam AS renavam, v.fl_ativo AS active, v.id_comb_pref AS preferredFuelId, v.ds_combs_permitidos AS allowedFuels,
                tp.ds_produto AS preferredFuelName,
                (SELECT COALESCE(SUM(nu_litros), 0) FROM tb_abastecimentos WHERE id_veiculo = v.id_veiculo) AS totalLitersConsumed,
                (SELECT COUNT(*) FROM tb_abastecimentos WHERE id_veiculo = v.id_veiculo) AS refuelingCount,
                (SELECT COALESCE(SUM(vl_economia), 0) FROM tb_abastecimentos WHERE id_veiculo = v.id_veiculo) AS totalSaved
         FROM tb_veiculo v
         JOIN tb_motorista m ON v.id_motorista = m.id_motorista
         LEFT JOIN tb_tipoproduto tp ON v.id_comb_pref = tp.id_produto
         WHERE m.id_empresa = ?
         ORDER BY v.nm_modelo ASC`,
        [companyId]
      );

      const [breakdowns]: any = await pool.execute(
        `SELECT a.id_veiculo AS vehicleId, tp.ds_produto AS fuelName, SUM(a.nu_litros) AS totalLiters
         FROM tb_abastecimentos a
         JOIN tb_tipoproduto tp ON a.id_combustivel = tp.id_produto
         JOIN tb_veiculo v ON a.id_veiculo = v.id_veiculo
         JOIN tb_motorista m ON v.id_motorista = m.id_motorista
         WHERE m.id_empresa = ? AND a.nu_litros > 0
         GROUP BY a.id_veiculo, tp.id_produto, tp.ds_produto`,
        [companyId]
      );

      const breakdownMap: Record<number, string[]> = {};
      for (const b of breakdowns) {
        const vId = Number(b.vehicleId);
        if (!breakdownMap[vId]) {
          breakdownMap[vId] = [];
        }
        breakdownMap[vId].push(`${b.fuelName}: ${Number(b.totalLiters || 0).toFixed(1)}L`);
      }

      res.json(rows.map((r: any) => ({
        id: String(r.id),
        plate: r.plate,
        model: r.model,
        brand: r.brand,
        driverName: r.driverName,
        renavam: r.renavam || "",
        id_comb_pref: r.preferredFuelId,
        preferredFuelName: r.preferredFuelName || "",
        ds_combs_permitidos: r.allowedFuels || "",
        active: r.active !== 0,
        totalLitersConsumed: Number(r.totalLitersConsumed || 0),
        refuelingCount: Number(r.refuelingCount || 0),
        totalSaved: Number(r.totalSaved || 0),
        fuelsBreakdown: breakdownMap[Number(r.id)]?.join(" | ") || ""
      })));
    } catch (e: any) {
      console.error("[GET_VEHICLES] Error fetching company vehicles:", e);
      res.status(500).json({ error: "Erro ao obter veículos: " + e.message });
    }
  });

  app.get("/api/empresa/abastecimentos", async (req, res) => {
    const token = req.cookies.session;
    let companyId: number = 1;

    if (req.query.companyId) {
      companyId = parseInt(req.query.companyId as string, 10);
    } else if (token) {
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        companyId = await getCompanyIdForUser(decoded.email);
      } catch (e) {
        console.warn("[GET_ABASTECIMENTOS] JWT verify failed, fallback to companyId = 1");
      }
    }

    try {

      const [rows]: any = await pool.execute(
        `SELECT 
          a.id_preco AS id,
          a.vl_preco_unitario AS price,
          a.nu_litros AS liters,
          a.vl_economia AS economy,
          a.dh_emissao_nfe AS date,
          a.id_veiculo AS vehicleId,
          a.id_posto AS stationId,
          a.id_combustivel AS fuelTypeId,
          tp.ds_produto AS fuelTypeName,
          p.nm_posto AS gasStation,
          p.nm_municipio AS city,
          p.sg_ufposto AS state,
          p.nm_bandeira AS brand,
          v.nm_modelo AS model,
          v.id_placa AS plate,
          a.id_qrcode AS qrcodeId,
          (SELECT url_qrcode FROM tb_qrcode WHERE id_qrcode = a.id_qrcode LIMIT 1) AS urlQrcode,
          COALESCE(a.geo_latitude, p.geo_latitude) AS latitude,
          COALESCE(a.geo_longitude, p.geo_longitude) AS longitude
         FROM tb_abastecimentos a
         JOIN tb_veiculo v ON a.id_veiculo = v.id_veiculo
         JOIN tb_motorista m ON v.id_motorista = m.id_motorista
         LEFT JOIN tb_postos p ON a.id_posto = p.id_posto
         LEFT JOIN tb_tipoproduto tp ON a.id_combustivel = tp.id_produto
         WHERE m.id_empresa = ?
         ORDER BY a.dh_emissao_nfe DESC`,
        [companyId]
      );

      const formatted = rows.map((r: any) => ({
        id: String(r.id),
        date: r.date ? new Date(r.date).toISOString() : null,
        vehicleId: String(r.vehicleId),
        model: r.model || "Desconhecido",
        plate: r.plate || "S/ Placa",
        liters: parseFloat(r.liters || 0),
        cost: parseFloat(r.liters || 0) * parseFloat(r.price || 0),
        price: parseFloat(r.price || 0),
        economy: parseFloat(r.economy || 0),
        fuelTypeId: r.fuelTypeId ? String(r.fuelTypeId) : null,
        fuelTypeName: r.fuelTypeName || "Outros",
        gasStation: r.gasStation || "Posto Não Identificado",
        city: r.city || "Município",
        state: r.state || "",
        brand: r.brand || "Outros",
        acceptsFuelCard: r.brand ? r.brand.toUpperCase() !== "OUTROS" : true,
        latitude: r.latitude ? String(r.latitude) : null,
        longitude: r.longitude ? String(r.longitude) : null,
        id_qrcode: r.qrcodeId,
        url_qrcode: r.urlQrcode
      }));

      res.json(formatted);
    } catch (e: any) {
      console.error("[GET_ABASTECIMENTOS] Error fetching company fuel logs:", e);
      res.status(500).json({ error: "Erro ao obter abastecimentos: " + e.message });
    }
  });

  // --- DRIVERS (MOTORISTAS) ENDPOINTS ---
  app.get("/api/empresa/drivers", async (req, res) => {
    const token = req.cookies.session;
    let companyId: number = 1;

    if (req.query.companyId) {
      companyId = parseInt(req.query.companyId as string, 10);
    } else if (token) {
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        companyId = await getCompanyIdForUser(decoded.email);
      } catch (e) {
        console.warn("[GET_DRIVERS] JWT verify failed, fallback to companyId = 1");
      }
    }

    try {

      const [rows]: any = await pool.execute(
        `SELECT m.id_motorista, m.nm_mot, m.ds_email, m.ds_telefone, m.nu_mot_cpf, m.nu_mot_cnh, m.dt_mot_cnh_val, 
                m.dt_cadastro, m.ds_foto, m.ds_google_foto, m.dt_contratacao, m.dt_ultimo_aso, 
                m.nu_total_routes, m.nu_total_km, m.nu_recent_incidents, m.ds_observations, 
                m.nu_performance, m.ds_status_fleet, m.id_status, m.fl_verificado, m.fl_ativo 
         FROM tb_motorista m 
         WHERE m.id_empresa = ? AND m.fl_ativo = 1`,
        [companyId]
      );

      const formattedDrivers = rows.map((m: any) => {
        let licenseStatus: 'valid' | 'expired' | 'warning' = 'valid';
        if (m.dt_mot_cnh_val) {
          const expiryDate = new Date(m.dt_mot_cnh_val);
          const today = new Date();
          const timeDiff = expiryDate.getTime() - today.getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
          if (daysDiff < 0) {
            licenseStatus = 'expired';
          } else if (daysDiff <= 30) {
            licenseStatus = 'warning';
          } else {
            licenseStatus = 'valid';
          }
        }

        return {
          id: String(m.id_motorista),
          name: m.nm_mot || '',
          avatar: m.ds_foto || m.ds_google_foto || '',
          license: m.nu_mot_cnh || 'Não informado',
          licenseStatus: licenseStatus,
          licenseExpiry: m.dt_mot_cnh_val ? new Date(m.dt_mot_cnh_val).toISOString().split('T')[0] : '',
          status: m.ds_status_fleet || 'off',
          performance: Number(m.nu_performance ?? 90),
          phone: m.ds_telefone || '',
          email: m.ds_email || '',
          hiringDate: m.dt_contratacao ? new Date(m.dt_contratacao).toISOString().split('T')[0] : '',
          lastMedicalExam: m.dt_ultimo_aso ? new Date(m.dt_ultimo_aso).toISOString().split('T')[0] : '',
          totalRoutes: Number(m.nu_total_routes ?? 0),
          totalKm: Number(m.nu_total_km ?? 0),
          recentIncidents: Number(m.nu_recent_incidents ?? 0),
          observations: m.ds_observations || '',
          cpf: m.nu_mot_cpf || '',
          companyId: m.id_empresa
        };
      });

      res.json(formattedDrivers);
    } catch (e: any) {
      console.error("[GET_DRIVERS] Error fetching drivers:", e);
      res.status(500).json({ error: "Erro ao obter motoristas: " + e.message });
    }
  });

  app.post("/api/empresa/drivers", async (req, res) => {
    const token = req.cookies.session;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const companyId = await getCompanyIdForUser(decoded.email);

      const {
        name,
        email,
        phone,
        cpf,
        license,
        licenseExpiry,
        status = 'off',
        performance = 90,
        hiringDate,
        lastMedicalExam,
        observations = '',
        avatar = '',
        totalRoutes = 0,
        totalKm = 0,
        recentIncidents = 0
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Nome é obrigatório" });
      }

      // Check if email already exists
      if (email) {
        const [existing]: any = await pool.execute(
          "SELECT id_motorista FROM tb_motorista WHERE ds_email = ?",
          [email.toLowerCase().trim()]
        );
        if (existing.length > 0) {
          return res.status(400).json({ error: "E-mail de motorista já cadastrado" });
        }
      }

      const [result]: any = await pool.execute(
        `INSERT INTO tb_motorista (
          nm_mot, ds_email, ds_telefone, nu_mot_cpf, nu_mot_cnh, dt_mot_cnh_val, 
          id_empresa, id_status, fl_verificado, fl_ativo, dt_cadastro,
          dt_contratacao, dt_ultimo_aso, ds_observations, nu_performance, ds_status_fleet, ds_foto,
          nu_total_routes, nu_total_km, nu_recent_incidents
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 3, 1, 1, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          email ? email.toLowerCase().trim() : '',
          phone || '',
          cpf || '',
          license || '',
          licenseExpiry || null,
          companyId,
          hiringDate || null,
          lastMedicalExam || null,
          observations || '',
          Number(performance ?? 90),
          status || 'off',
          avatar || '',
          Number(totalRoutes || 0),
          Number(totalKm || 0),
          Number(recentIncidents || 0)
        ]
      );

      res.status(201).json({ success: true, id_motorista: result.insertId });
    } catch (e: any) {
      console.error("[POST_DRIVER] Error creating driver:", e);
      res.status(500).json({ error: "Erro ao cadastrar motorista: " + e.message });
    }
  });

  app.put("/api/empresa/drivers/:id", async (req, res) => {
    const token = req.cookies.session;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const companyId = await getCompanyIdForUser(decoded.email);

      const { id } = req.params;
      const {
        name,
        email,
        phone,
        cpf,
        license,
        licenseExpiry,
        status,
        performance,
        hiringDate,
        lastMedicalExam,
        observations,
        avatar,
        totalRoutes,
        totalKm,
        recentIncidents
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Nome é obrigatório" });
      }

      await pool.execute(
        `UPDATE tb_motorista SET 
          nm_mot = ?,
          ds_email = ?,
          ds_telefone = ?,
          nu_mot_cpf = ?,
          nu_mot_cnh = ?,
          dt_mot_cnh_val = ?,
          dt_contratacao = ?,
          dt_ultimo_aso = ?,
          ds_observations = ?,
          nu_performance = ?,
          ds_status_fleet = ?,
          ds_foto = ?,
          nu_total_routes = ?,
          nu_total_km = ?,
          nu_recent_incidents = ?
         WHERE id_motorista = ? AND id_empresa = ?`,
        [
          name,
          email ? email.toLowerCase().trim() : '',
          phone || '',
          cpf || '',
          license || '',
          licenseExpiry || null,
          hiringDate || null,
          lastMedicalExam || null,
          observations || '',
          Number(performance ?? 90),
          status || 'off',
          avatar || '',
          Number(totalRoutes ?? 0),
          Number(totalKm ?? 0),
          Number(recentIncidents ?? 0),
          id,
          companyId
        ]
      );

      res.json({ success: true });
    } catch (e: any) {
      console.error("[PUT_DRIVER] Error updating driver:", e);
      res.status(500).json({ error: "Erro ao atualizar motorista: " + e.message });
    }
  });

  app.delete("/api/empresa/drivers/:id", async (req, res) => {
    const token = req.cookies.session;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const companyId = await getCompanyIdForUser(decoded.email);

      const { id } = req.params;
      await pool.execute(
        "UPDATE tb_motorista SET fl_ativo = 0 WHERE id_motorista = ? AND id_empresa = ?",
        [id, companyId]
      );

      res.json({ success: true });
    } catch (e: any) {
      console.error("[DELETE_DRIVER] Error deleting driver:", e);
      res.status(500).json({ error: "Erro ao excluir motorista: " + e.message });
    }
  });

  // --- VEHICLES ASSIGNED TO A DRIVER (BACKOFFICE) ---
  app.get("/api/empresa/drivers/:id/vehicles", async (req, res) => {
    const token = req.cookies.session;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const { id } = req.params;

      const [rows]: any = await pool.execute(
        `SELECT id_veiculo AS id, id_placa AS plate, nu_renavam AS renavam, nm_modelo AS model, nm_marca AS brand, fl_ativo AS active
         FROM tb_veiculo
         WHERE id_motorista = ?`,
        [id]
      );

      res.json(rows.map((r: any) => ({
        id: String(r.id),
        plate: r.plate || '',
        renavam: r.renavam || '',
        model: r.model || '',
        brand: r.brand || '',
        active: r.active !== 0
      })));
    } catch (e: any) {
      console.error("[GET_DRIVER_VEHICLES] Error fetching:", e);
      res.status(500).json({ error: "Erro ao obter veículos do motorista: " + e.message });
    }
  });

  app.post("/api/empresa/drivers/:id/vehicles", async (req, res) => {
    const token = req.cookies.session;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const { id } = req.params;
      const { plate, renavam, model, brand } = req.body;

      if (!plate || !model || !brand) {
        return res.status(400).json({ error: "Placa, modelo e marca são obrigatórios." });
      }

      const cleanRenavam = renavam ? renavam.replace(/\D/g, '').substring(0, 11) : '';
      const cleanPlate = plate ? plate.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';

      const [result]: any = await pool.execute(
        "INSERT INTO tb_veiculo (id_motorista, id_placa, nu_renavam, nm_modelo, nm_marca, fl_ativo) VALUES (?, ?, ?, ?, ?, 1)",
        [id, cleanPlate, cleanRenavam, model, brand]
      );

      res.json({ success: true, id: result.insertId });
    } catch (e: any) {
      console.error("[POST_DRIVER_VEHICLE] Error creating:", e);
      res.status(500).json({ error: "Erro ao cadastrar veículo para motorista: " + e.message });
    }
  });

  app.put("/api/empresa/vehicles/:id_veiculo", async (req, res) => {
    const token = req.cookies.session;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const { id_veiculo } = req.params;
      const { plate, renavam, model, brand } = req.body;

      if (!plate || !model || !brand) {
        return res.status(400).json({ error: "Placa, modelo e marca são obrigatórios." });
      }

      const cleanRenavam = renavam ? renavam.replace(/\D/g, '').substring(0, 11) : '';
      const cleanPlate = plate ? plate.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';

      await pool.execute(
        "UPDATE tb_veiculo SET id_placa = ?, nu_renavam = ?, nm_modelo = ?, nm_marca = ? WHERE id_veiculo = ?",
        [cleanPlate, cleanRenavam, model, brand, id_veiculo]
      );

      res.json({ success: true });
    } catch (e: any) {
      console.error("[PUT_DRIVER_VEHICLE] Error updating:", e);
      res.status(500).json({ error: "Erro ao atualizar veículo: " + e.message });
    }
  });

  app.post("/api/empresa/vehicles/:id_veiculo/toggle", async (req, res) => {
    const token = req.cookies.session;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const { id_veiculo } = req.params;
      const { active } = req.body;

      await pool.execute(
        "UPDATE tb_veiculo SET fl_ativo = ? WHERE id_veiculo = ?",
        [active ? 1 : 0, id_veiculo]
      );

      res.json({ success: true });
    } catch (e: any) {
      console.error("[TOGGLE_DRIVER_VEHICLE] Error toggling status:", e);
      res.status(500).json({ error: "Erro ao alterar status do veículo: " + e.message });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const token = req.cookies.session;
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      console.log(`[AUTH] /me - Decoded session for ${decoded.email}, registerRequired: ${decoded.registerRequired}`);
      
      // If it's a registration temporary token, return it as is
      if (decoded.registerRequired) {
        return res.json(decoded);
      }

      // Fetch fresh status from DB
      const [rows] = await pool.execute(
        "SELECT m.id_motorista, m.nm_mot, m.ds_telefone, m.nu_mot_cpf, m.nu_mot_cnh, m.dt_mot_cnh_val, m.dt_cadastro, m.ds_foto, m.ds_google_foto, m.id_combustivel_pref, m.nu_raio_busca_pref, s.ds_status, m.id_status, m.fl_verificado, m.ds_email, m.id_empresa FROM tb_motorista m JOIN tb_status s ON m.id_status = s.id_status WHERE m.ds_email = ?",
        [decoded.email]
      );
      const drivers = rows as any[];

      if (drivers.length === 0) {
        // Query if this is an authorized backoffice contact
        const [contactRows] = await pool.execute(
          "SELECT c.id_contato, c.nm_contato, c.ds_email, c.id_empresa, e.nm_empresa, c.dt_cadastro, c.fl_ativo FROM tb_empresa_contato c JOIN tb_empresa e ON c.id_empresa = e.id_empresa WHERE c.ds_email = ? AND c.fl_ativo = 1 AND c.tp_contato = 'A'",
          [decoded.email]
        );
        const contacts = contactRows as any[];
        
        if (contacts.length === 0) {
          console.warn(`[AUTH] /me - User ${decoded.email} not found in DB at all`);
          res.clearCookie("session", {
            secure: true,
            sameSite: "none",
            httpOnly: true,
          });
          return res.status(401).json({ error: "User not found" });
        }

        const contact = contacts[0];
        const userData = {
          id: null,
          name: contact.nm_contato,
          email: contact.ds_email,
          createdAt: contact.dt_cadastro,
          status: 'AUTHORIZED',
          verified: true,
          id_status: 3,
          isAdmin: true,
          companyId: contact.id_empresa,
          companyName: contact.nm_empresa,
          isBackofficeContactOnly: true
        };
        return res.json(userData);
      }

      const driver = drivers[0];
      console.log(`[AUTH] /me - Found user ${driver.ds_email}, status: ${driver.ds_status}, id_status: ${driver.id_status}`);
      
      const isAdmin = await checkIsAdmin(driver.ds_email);
      
      const userData = {
        id: driver.id_motorista,
        name: driver.nm_mot,
        email: driver.ds_email,
        phone: driver.ds_telefone,
        cpf: driver.nu_mot_cpf,
        cnh: driver.nu_mot_cnh,
        cnhExpiration: driver.dt_mot_cnh_val ? new Date(driver.dt_mot_cnh_val).toISOString().split('T')[0] : null,
        createdAt: driver.dt_cadastro,
        photoURL: driver.ds_foto,
        googlePhotoURL: driver.ds_google_foto,
        preferredFuel: driver.id_combustivel_pref,
        searchRadius: driver.nu_raio_busca_pref,
        status: driver.ds_status,
        verified: !!driver.fl_verificado,
        id_status: driver.id_status,
        isAdmin: isAdmin,
        companyId: driver.id_empresa
      };

      res.json(userData);
    } catch (e) {
      console.error(`[AUTH] /me - Token error:`, e);
      res.status(401).json({ error: "Invalid session" });
    }
  });

  app.get("/api/auth/logout", (req, res) => {
    res.clearCookie("session", {
      secure: true,
      sameSite: "none",
      httpOnly: true,
    });
    res.json({ success: true });
  });

  // Bypass Auth for development
  app.get("/api/auth/dev-login", (req, res) => {
    const email = req.query.email as string;
    if (!email) return res.status(400).json({ error: "Email required" });
    
    // Create token for dev
    const token = jwt.sign({ email, name: "Motorista Dev" }, JWT_SECRET, { expiresIn: "30d" });
    
    res.cookie("session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    
    res.json({ success: true, message: "Dev login successful as " + email });
  });

  app.get("/api/user/insights", async (req, res) => {
    const token = req.cookies.session;
    const { municipio, id_veiculo } = req.query;
    if (!token) return res.status(401).json({ error: "Sessão expirada" });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      if (!decoded.email) throw new Error("Email não encontrado no token");

      console.log(`[DEBUG] Insights request for: ${decoded.email}, city: ${municipio}, vehicleId: ${id_veiculo}`);

      // 1. Gasto Mensal (Últimos 6 meses)
      let monthlySpendQuery = `
        SELECT 
          DATE_FORMAT(a.dh_emissao_nfe, '%Y-%m') as month,
          SUM(COALESCE(a.nu_litros, 0) * COALESCE(a.vl_preco_unitario, 0)) as total_spent,
          SUM(COALESCE(a.vl_economia, 0)) as total_economy
        FROM tb_abastecimentos a
        JOIN tb_veiculo v ON a.id_veiculo = v.id_veiculo
        JOIN tb_motorista m ON v.id_motorista = m.id_motorista
        JOIN tb_postos p ON a.id_posto = p.id_posto
        WHERE m.ds_email = ? AND a.dh_emissao_nfe IS NOT NULL AND a.dh_emissao_nfe >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      `;
      const monthlySpendParams: any[] = [decoded.email];

      if (id_veiculo) {
        monthlySpendQuery += ` AND v.id_veiculo = ? `;
        monthlySpendParams.push(id_veiculo);
      }
      
      if (municipio) {
        monthlySpendQuery += ` AND p.nm_municipio = ? `;
        monthlySpendParams.push(municipio);
      }
      
      monthlySpendQuery += `
        GROUP BY DATE_FORMAT(a.dh_emissao_nfe, '%Y-%m')
        ORDER BY month ASC
      `;
      
      const [monthlySpend]: any = await pool.execute(monthlySpendQuery, monthlySpendParams);

      // 2. Gasto por Tipo de Combustível
      let fuelSpendQuery = `
        SELECT 
          COALESCE(tp.ds_produto, 'Outros') as name,
          SUM(COALESCE(a.nu_litros, 0) * COALESCE(a.vl_preco_unitario, 0)) as value
        FROM tb_abastecimentos a
        JOIN tb_veiculo v ON a.id_veiculo = v.id_veiculo
        JOIN tb_motorista m ON v.id_motorista = m.id_motorista
        JOIN tb_postos p ON a.id_posto = p.id_posto
        LEFT JOIN tb_tipoproduto tp ON a.id_combustivel = tp.id_produto
        WHERE m.ds_email = ?
      `;
      const fuelSpendParams: any[] = [decoded.email];

      if (id_veiculo) {
        fuelSpendQuery += ` AND v.id_veiculo = ? `;
        fuelSpendParams.push(id_veiculo);
      }
      
      if (municipio) {
        fuelSpendQuery += ` AND p.nm_municipio = ? `;
        fuelSpendParams.push(municipio);
      }
      
      fuelSpendQuery += `
        GROUP BY COALESCE(tp.ds_produto, 'Outros')
      `;
      
      const [fuelSpend]: any = await pool.execute(fuelSpendQuery, fuelSpendParams);

      // 3. Evolução do Preço Médio (Ultimos 30 dias - Geral)
      let priceTrendQuery = `
        SELECT 
          DATE_FORMAT(a.dh_emissao_nfe, '%Y-%m-%d') as date,
          COALESCE(tp.ds_produto, 'Outros') as fuel,
          AVG(a.vl_preco_unitario) as avg_price
        FROM tb_abastecimentos a
        JOIN tb_postos p ON a.id_posto = p.id_posto
        LEFT JOIN tb_tipoproduto tp ON a.id_combustivel = tp.id_produto
        WHERE a.dh_emissao_nfe IS NOT NULL 
          AND a.dh_emissao_nfe >= DATE_SUB(NOW(), INTERVAL 30 DAY) 
          AND a.vl_preco_unitario > 0
      `;
      const priceTrendParams: any[] = [];
      
      if (municipio) {
        priceTrendQuery += ` AND p.nm_municipio = ? `;
        priceTrendParams.push(municipio);
      }
      
      priceTrendQuery += `
        GROUP BY DATE_FORMAT(a.dh_emissao_nfe, '%Y-%m-%d'), COALESCE(tp.ds_produto, 'Outros')
        ORDER BY date ASC
      `;
      
      const [priceTrend]: any = await pool.execute(priceTrendQuery, priceTrendParams);

      // 4. Gasto por Posto (Top 5)
      let stationSpendQuery = `
        SELECT 
          p.nm_posto as name,
          SUM(COALESCE(a.nu_litros, 0) * COALESCE(a.vl_preco_unitario, 0)) as value
        FROM tb_abastecimentos a
        JOIN tb_veiculo v ON a.id_veiculo = v.id_veiculo
        JOIN tb_motorista m ON v.id_motorista = m.id_motorista
        JOIN tb_postos p ON a.id_posto = p.id_posto
        WHERE m.ds_email = ?
      `;
      const stationSpendParams: any[] = [decoded.email];

      if (id_veiculo) {
        stationSpendQuery += ` AND v.id_veiculo = ? `;
        stationSpendParams.push(id_veiculo);
      }
      
      if (municipio) {
        stationSpendQuery += ` AND p.nm_municipio = ? `;
        stationSpendParams.push(municipio);
      }
      
      stationSpendQuery += `
        GROUP BY p.nm_posto
        ORDER BY value DESC
        LIMIT 5
      `;
      
      const [stationSpend]: any = await pool.execute(stationSpendQuery, stationSpendParams);

      console.log(`[DEBUG] Results - Monthly: ${monthlySpend.length}, Fuel: ${fuelSpend.length}, Trend: ${priceTrend.length}, Stations: ${stationSpend.length}`);

      res.json({
        monthlySpend,
        fuelSpend,
        priceTrend,
        stationSpend
      });
    } catch (e: any) {
      console.error("[INSIGHTS] Error:", e);
      res.status(500).json({ error: `Erro: ${e.message || "Erro desconhecido"}` });
    }
  });

  app.get("/api/coverage-stats", async (req, res) => {
    try {
      const query = `
        SELECT 
          p.nm_municipio,
          COUNT(DISTINCT p.id_posto) as total_postos,
          COUNT(DISTINCT pc.id_posto) as postos_com_preco
        FROM tb_postos p
        LEFT JOIN tb_precos_combustiveis pc ON p.id_posto = pc.id_posto AND pc.vl_preco_venda IS NOT NULL AND pc.vl_preco_venda > 0
        WHERE LOWER(p.nm_municipio) IN ('petrópolis', 'rio de janeiro', 'niterói', 'juiz de fora')
        GROUP BY p.nm_municipio
      `;
      const [rows]: any = await pool.execute(query);
      res.json(rows);
    } catch (error: any) {
      console.error("Error fetching coverage stats:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/user/stats", async (req, res) => {
    const token = req.cookies.session;
    const { id_veiculo } = req.query;
    if (!token) return res.status(401).json({ error: "Sessão expirada" });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      
      // Get driver email to filter abastecimentos
      // Note: tb_abastecimentos is linked either by 'login' or we need to bridge it.
      // The processador_nfe.py uses 'ROBO_NFCE' for login, but we should probably use the user's email if possible.
      // However, the prompt says "último abastecimento do cliente".
      // We need to link tb_abastecimentos to the motorista.
      // Currently, tb_abastecimentos has a 'login' column.
      
      // Let's check how tb_abastecimentos is linked to QR codes.
      // QR codes are linked to vehicles. Vehicles are linked to motoristas.
      
      let economyQuery = `
        SELECT 
          SUM(a.vl_economia) as total_economy,
          SUM(a.nu_litros) as total_liters,
          SUM(a.nu_litros * a.vl_preco_unitario) as total_spent
        FROM tb_abastecimentos a
        JOIN tb_veiculo v ON a.id_veiculo = v.id_veiculo
        JOIN tb_motorista m ON v.id_motorista = m.id_motorista
        WHERE m.ds_email = ?
      `;
      const economyParams: any[] = [decoded.email];

      if (id_veiculo) {
        economyQuery += ` AND v.id_veiculo = ? `;
        economyParams.push(id_veiculo);
      }

      const [economyRows]: any = await pool.execute(economyQuery, economyParams);

      let lastPurchaseQuery = `
        SELECT 
          a.*, 
          p.nm_posto, 
          p.geo_latitude as station_lat, 
          p.geo_longitude as station_lng,
          tp.ds_produto as ds_tipoproduto
        FROM tb_abastecimentos a
        JOIN tb_veiculo v ON a.id_veiculo = v.id_veiculo
        JOIN tb_motorista m ON v.id_motorista = m.id_motorista
        JOIN tb_postos p ON a.id_posto = p.id_posto
        JOIN tb_tipoproduto tp ON a.id_combustivel = tp.id_produto
        WHERE m.ds_email = ?
      `;
      const lastPurchaseParams: any[] = [decoded.email];

      if (id_veiculo) {
        lastPurchaseQuery += ` AND v.id_veiculo = ? `;
        lastPurchaseParams.push(id_veiculo);
      }

      lastPurchaseQuery += `
          AND (a.id_qrcode IS NULL OR a.id_preco = (
            SELECT id_preco 
            FROM tb_abastecimentos sub1 
            WHERE sub1.id_qrcode = a.id_qrcode 
            ORDER BY (sub1.id_combustivel = COALESCE(v.id_comb_pref, sub1.id_combustivel)) DESC, sub1.nu_litros DESC, sub1.id_preco ASC
            LIMIT 1
          ))
        ORDER BY a.dh_emissao_nfe DESC
        LIMIT 1
      `;

      const [lastPurchaseRows]: any = await pool.execute(lastPurchaseQuery, lastPurchaseParams);

      const [userRows]: any = await pool.execute(
        "SELECT fl_primeira_busca, dt_cadastro FROM tb_motorista WHERE ds_email = ?", 
        [decoded.email]
      );
      
      let scanQuery = `
        SELECT MAX(q.dt_qrcode) as last_scan, COUNT(*) as scan_count
        FROM tb_qrcode q
        JOIN tb_veiculo v ON q.id_veiculo = v.id_veiculo
        JOIN tb_motorista m ON v.id_motorista = m.id_motorista
        WHERE m.ds_email = ?
      `;
      const scanParams: any[] = [decoded.email];

      if (id_veiculo) {
        scanQuery += ` AND v.id_veiculo = ? `;
        scanParams.push(id_veiculo);
      }

      const [scanRows]: any = await pool.execute(scanQuery, scanParams);

      const totalScans = scanRows[0]?.scan_count || 0;
      const lastScan = scanRows[0]?.last_scan;
      const regDate = userRows[0]?.dt_cadastro ? new Date(userRows[0].dt_cadastro) : new Date();
      const isFirstTime = userRows[0]?.fl_primeira_busca === 1;
      
      const now = new Date();
      let canSearch = false;
      let daysRemaining = 0;

      // 1. Trial for new users (24h)
      const hoursSinceReg = (now.getTime() - regDate.getTime()) / (1000 * 60 * 60);
      if (hoursSinceReg <= 24) {
        canSearch = true;
        daysRemaining = 1;
      }

      // 2. Scan validity (7 days)
      if (lastScan) {
        const lastScanDate = new Date(lastScan);
        const diffDays = (now.getTime() - lastScanDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays <= 7) {
          canSearch = true;
          daysRemaining = Math.max(daysRemaining, Math.ceil(7 - diffDays));
        }
      }

      // 3. Very first search flag
      if (isFirstTime) canSearch = true;

      res.json({
        totalEconomy: parseFloat(economyRows[0]?.total_economy || 0),
        totalLiters: parseFloat(economyRows[0]?.total_liters || 0),
        totalSpent: parseFloat(economyRows[0]?.total_spent || 0),
        lastPurchase: lastPurchaseRows[0] || null,
        canSearch: canSearch,
        daysRemaining,
        totalScans
      });
    } catch (e) {
      console.error("[STATS] Error:", e);
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  });

  // Centralized Multi-Domain Host Router Middlewares
  app.use((req, res, next) => {
    if (req.url.startsWith("/api/")) {
      return next();
    }

    const host = req.hostname || req.headers.host || "";
    const isBackofficeHost = host.includes("backoffice.");

    // Seamlessly rewrite paths on backoffice domain to use /backoffice internally without changing URL or redirecting
    if (isBackofficeHost) {
      const hasExt = path.extname(req.path) !== "";
      if (!hasExt && !req.url.startsWith("/site") && !req.url.startsWith("/backoffice")) {
        req.url = `/backoffice${req.url === "/" ? "/" : req.url}`;
      }
      return next();
    }

    // Check if the host is the institutional website domain (e.g. encheotanque.net.br or www.encheotanque.net.br)
    const isWebsiteHost = host.includes("encheotanque.net.br") && !host.startsWith("app.") && !host.includes("backoffice.");

    if (isWebsiteHost) {
      // Direct backoffice path to bypass landing page
      if (req.url.startsWith("/backoffice")) {
        return next();
      }

      // Check if it is requesting some file or asset (we don't want to intercept CSS/JS of the app/site)
      const hasExt = path.extname(req.path) !== "";
      if (!hasExt) {
        const websiteIndex = process.env.NODE_ENV !== "production"
          ? path.join(process.cwd(), "public", "site", "index.html")
          : path.join(process.cwd(), "dist", "site", "index.html");

        if (fs.existsSync(websiteIndex)) {
          return res.sendFile(websiteIndex);
        }
      }
    } else {
      // On non-website hosts (app.encheotanque.net.br, dev previews, localhost, etc)
      // We can explicitly view the site by requesting /site or /site/
      if (req.url.startsWith("/site") || req.url.startsWith("/site/")) {
        const hasExt = path.extname(req.path) !== "";
        if (!hasExt) {
          const websiteIndex = process.env.NODE_ENV !== "production"
            ? path.join(process.cwd(), "public", "site", "index.html")
            : path.join(process.cwd(), "dist", "site", "index.html");

          if (fs.existsSync(websiteIndex)) {
            return res.sendFile(websiteIndex);
          }
        }
      }
    }

    next();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    
    // Main App Vite
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: { port: 24678 }
      },
      appType: "spa",
    });

    // Backoffice App Vite
    const backofficeVite = await createViteServer({
      root: path.join(process.cwd(), "backoffice"),
      server: { 
        middlewareMode: true,
        hmr: { port: 24679 }
      },
      appType: "spa",
    });

    // Route requests conditionally to the appropriate Vite middleware
    app.use((req, res, next) => {
      if (req.url.startsWith("/backoffice")) {
        backofficeVite.middlewares(req, res, next);
      } else {
        vite.middlewares(req, res, next);
      }
    });
    
    // Add SPA fallback for backoffice dev mode
    app.get("/backoffice*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), "backoffice", "index.html"), "utf-8");
        template = await backofficeVite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        next(e);
      }
    });

    // Add SPA fallback for main dev mode
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    // In production, we serve from the dist directory in the current working directory
    const distPath = path.join(process.cwd(), "dist");
    console.log("[SERVER] Production Mode: Serving static files from:", distPath);
    
    app.use(express.static(distPath, {
      maxAge: '1d',
      setHeaders: (res, filePath) => {
        // Aggressive caching for hashed Vite static assets (JS, CSS, fonts, SVG)
        if (filePath.includes('/assets/') || filePath.includes('\\assets\\')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (
          filePath.endsWith('manifest.json') || 
          filePath.endsWith('sw.js') || 
          filePath.endsWith('robots.txt') || 
          filePath.endsWith('sitemap.xml') ||
          filePath.endsWith('.html')
        ) {
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        }
        
        if (filePath.endsWith('manifest.json')) {
          res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
        }
        if (filePath.endsWith('sw.js')) {
          res.setHeader('Service-Worker-Allowed', '/');
        }
      }
    }));

    app.get("*", (req, res) => {
      // Avoid sending index.html for API calls that failed
      if (req.url.startsWith('/api/')) {
        return res.status(404).json({ error: "API route not found" });
      }
      
      // If it's a backoffice route, send backoffice's index.html
      if (req.url.startsWith('/backoffice')) {
        return res.sendFile(path.join(distPath, "backoffice", "index.html"));
      }

      // If it's the website host, send the site's index.html
      const host = req.hostname || req.headers.host || "";
      const isWebsiteHost = host.includes("encheotanque.net.br") && !host.startsWith("app.") && !host.includes("backoffice.");
      if (isWebsiteHost) {
        return res.sendFile(path.join(distPath, "site", "index.html"));
      }
      
      // If we are explicitly previewing the site on developer previews / localhost via /site
      if (req.url.startsWith('/site')) {
        return res.sendFile(path.join(distPath, "site", "index.html"));
      }
      
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  async function downloadBrazilMap() {
    const filePath = path.join(process.cwd(), 'public', 'documentos', 'mapa_brasil.svg');
    if (!fs.existsSync(filePath)) {
      console.log("[SERVER] Downloading Brazil Map SVG...");
      try {
        const res = await fetch("https://upload.wikimedia.org/wikipedia/commons/e/ec/Brazil_blank_map.svg", {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
          }
        });
        if (res.ok) {
          const text = await res.text();
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, text);
          console.log("[SERVER] Brazil Map SVG downloaded successfully to:", filePath);
        } else {
          console.error("[SERVER] Failed to download Brazil Map SVG, status:", res.status);
        }
      } catch (err) {
        console.error("[SERVER] Error downloading Brazil Map SVG:", err);
      }
    } else {
      console.log("[SERVER] Brazil Map SVG already exists.");
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Running on http://0.0.0.0:${PORT}`);
    console.log(`[SERVER] Environment: ${process.env.NODE_ENV}`);
    
    // Download Brazil Map SVG if needed
    downloadBrazilMap().catch(err => {
      console.error("[SERVER] Map download error:", err);
    });
    
    // Ensure database schema is up to date in background
    console.log("[SERVER] Initializing database...");
    initDb().then(() => {
      console.log("[SERVER] Database schema checked and normalized.");
    }).catch(err => {
      console.error("[SERVER] Database initialization error:", err);
    });
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Failed to start server:", err);
});
