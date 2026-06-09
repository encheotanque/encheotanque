import React from 'react';
import { Newspaper, ExternalLink, Calendar, Tag } from 'lucide-react';
import { mockNews } from '../data/mockData';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export const News: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Central de Notícias</h1>
        <p className="text-slate-500">Mantenha-se atualizado com os preços e regulamentações do setor.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {mockNews.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden card-hover"
          >
            <div className="p-1.5">
               <div className={cn(
                 "h-32 w-full rounded-xl bg-gradient-to-br flex items-center justify-center",
                 item.category === 'price' ? "from-emerald-50 to-emerald-100" :
                 item.category === 'regulation' ? "from-blue-50 to-blue-100" : "from-slate-50 to-slate-100"
               )}>
                 <Newspaper className={cn(
                   "size-10",
                   item.category === 'price' ? "text-emerald-500" :
                   item.category === 'regulation' ? "text-blue-500" : "text-slate-500"
                 )} />
               </div>
            </div>
            
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  item.category === 'price' ? "bg-emerald-50 text-emerald-600" :
                  item.category === 'regulation' ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-600"
                )}>
                  {item.category === 'price' ? 'Preços' : item.category === 'regulation' ? 'Regulamentação' : 'Mercado'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <Calendar className="size-3" />
                  {new Date(item.date).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <h2 className="text-lg font-bold text-slate-900 leading-tight mb-2 line-clamp-2">
                {item.title}
              </h2>
              
              <p className="text-sm text-slate-500 line-clamp-3 mb-6">
                {item.summary}
              </p>

              <div className="mt-auto flex items-center justify-between border-t border-slate-50 pt-4">
                <div className="flex items-center gap-2">
                   <div className="size-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                     {item.source.charAt(0)}
                   </div>
                   <span className="text-xs font-semibold text-slate-600">{item.source}</span>
                </div>
                <a 
                  href={item.url}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline transition-all"
                >
                  Ler mais
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Featured Newsletter/Subscription */}
      <div className="rounded-3xl bg-slate-900 p-8 text-white relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <h3 className="text-2xl font-bold mb-2">Fique por dentro das mudanças da ANP</h3>
          <p className="text-slate-400 mb-6 text-sm">Inscreva-se para receber alertas em tempo real sobre variações de preço e novas normativas diretamente no seu painel.</p>
          <div className="flex gap-2">
            <input 
              type="email" 
              placeholder="Seu melhor e-mail" 
              className="flex-1 bg-white/10 rounded-xl px-4 py-2 border border-white/20 outline-none focus:border-white/40 text-sm"
            />
            <button className="bg-primary hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-xl text-sm transition-all">
              Inscrever
            </button>
          </div>
        </div>
        
        {/* Abstract background elements */}
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Newspaper className="size-48" />
        </div>
      </div>
    </div>
  );
};
