import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  CreditCard, 
  Calendar, 
  Smartphone, 
  ShieldCheck, 
  Info,
  ChevronRight,
  ExternalLink,
  Check,
  Plus,
  X,
  Mail,
  RefreshCw,
  Sparkles,
  Save
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface EmailOption {
  email: string;
  name: string;
  isSelected?: boolean;
}

interface CompanyConfig {
  id_empresa: number;
  nu_emp_cnpj: string;
  nm_emp_razao: string;
  nm_emp_fantasia: string;
  fl_ativo: number;
  emailOptions: EmailOption[];
}

const formatCNPJ = (value: string): string => {
  const clean = value.replace(/\D/g, '').slice(0, 14);
  if (clean.length <= 2) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
  if (clean.length <= 8) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`;
  if (clean.length <= 12) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`;
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
};

export const Settings: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [idEmpresa, setIdEmpresa] = useState<number>(1);
  const [razaoSocial, setRazaoSocial] = useState<string>('');
  const [cnpj, setCnpj] = useState<string>('');
  const [nomeFantasia, setNomeFantasia] = useState<string>('');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [emailOptions, setEmailOptions] = useState<EmailOption[]>([]);
  const [customEmailInput, setCustomEmailInput] = useState<string>('');

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await fetch('/api/empresa/config');
      if (resp.ok) {
        const data: CompanyConfig = await resp.json();
        setIdEmpresa(data.id_empresa);
        setRazaoSocial(data.nm_emp_razao || '');
        setCnpj(formatCNPJ(data.nu_emp_cnpj || ''));
        setNomeFantasia(data.nm_emp_fantasia || '');
        setEmailOptions(data.emailOptions || []);
        
        // Extract selected emails initially
        const selected = (data.emailOptions || [])
          .filter(opt => opt.isSelected)
          .map(opt => opt.email);
        setSelectedEmails(selected);
      } else {
        const errData = await resp.json();
        setError(errData.error || 'Não foi possível carregar os dados da empresa.');
      }
    } catch (e: any) {
      console.error('[SETTINGS] Fetch error:', e);
      setError('Erro de rede ao conectar com o banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const resp = await fetch('/api/empresa/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id_empresa: idEmpresa,
          nu_emp_cnpj: cnpj.replace(/\D/g, ''),
          nm_emp_razao: razaoSocial,
          nm_emp_fantasia: nomeFantasia,
          selectedEmails: selectedEmails
        })
      });

      if (resp.ok) {
        setSuccess('Dados da empresa salvos e vinculados ao banco de dados com sucesso!');
        // Refresh options with newly selected status
        loadConfig();
      } else {
        const errData = await resp.json();
        setError(errData.error || 'Erro ao salvar dados da empresa.');
      }
    } catch (e: any) {
      console.error('[SETTINGS] Save error:', e);
      setError('Erro de conexão ao tentar salvar.');
    } finally {
      setSaving(false);
    }
  };

  const toggleEmail = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (selectedEmails.includes(cleanEmail)) {
      setSelectedEmails(selectedEmails.filter(e => e !== cleanEmail));
    } else {
      setSelectedEmails([...selectedEmails, cleanEmail]);
    }
  };

  const handleAddCustomEmail = () => {
    if (!customEmailInput) return;
    const cleanEmail = customEmailInput.trim().toLowerCase();
    
    // Simple email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      alert('Por favor insira um endereço de e-mail válido.');
      return;
    }

    if (selectedEmails.includes(cleanEmail)) {
      setCustomEmailInput('');
      return;
    }

    // Toggle/Add to match
    setSelectedEmails([...selectedEmails, cleanEmail]);
    
    // Add to options so it's visible if not already there
    if (!emailOptions.some(opt => opt.email.toLowerCase() === cleanEmail)) {
      setEmailOptions([
        ...emailOptions,
        { email: cleanEmail, name: cleanEmail.split('@')[0] }
      ]);
    }
    setCustomEmailInput('');
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex h-96 flex-col items-center justify-center gap-4">
        <RefreshCw className="size-10 text-slate-400 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Buscando dados em tb_empresa...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Configurações</h1>
        <p className="text-slate-500">Gerencie os dados da sua empresa vinculados diretamente ao banco de dados.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Company Info Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 p-6 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="size-5 text-slate-400" />
                Dados da Empresa
              </h3>
              <span className="text-[10px] font-bold uppercase py-1 px-2.5 rounded-lg bg-primary/10 text-slate-800 border border-primary/20 flex items-center gap-1.5">
                <Sparkles className="size-3" /> Conexão Segura
              </span>
            </div>

            <div className="p-6 space-y-6">
              {/* Notifications */}
              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-700 font-medium">
                  {success}
                </div>
              )}

              <div className="grid gap-6 sm:grid-cols-2">
                {/* Razão Social */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Razão Social</label>
                  <input 
                    type="text" 
                    value={razaoSocial} 
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    required
                    placeholder="Razão Social da Empresa"
                    className="w-full text-sm font-medium text-slate-900 bg-white p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 transition-colors"
                  />
                </div>

                {/* Nome Fantasia */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nome Fantasia</label>
                  <input 
                    type="text" 
                    value={nomeFantasia} 
                    onChange={(e) => setNomeFantasia(e.target.value)}
                    required
                    placeholder="Nome Fantasia / Marca"
                    className="w-full text-sm font-medium text-slate-900 bg-white p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 transition-colors"
                  />
                </div>

                {/* CNPJ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">CNPJ</label>
                  <input 
                    type="text" 
                    value={cnpj} 
                    onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                    required
                    maxLength={18}
                    placeholder="00.000.000/0000-00"
                    className="w-full text-sm font-medium text-slate-900 bg-white p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 transition-colors font-mono"
                  />
                </div>

                {/* Email Administrativo - Multi Select Component */}
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Mail className="size-3.5 text-slate-400" />
                    E-mails Administrativos Autorizados
                  </label>
                  
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
                    {/* Active Badges */}
                    <div className="flex flex-wrap gap-2">
                      {selectedEmails.length > 0 ? (
                        selectedEmails.map(email => (
                          <span 
                            key={email}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-slate-900 text-xs font-semibold border border-primary/30 shadow-sm"
                          >
                            {email}
                            <button
                              type="button"
                              onClick={() => toggleEmail(email)}
                              className="text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                            >
                              <X className="size-3.5" />
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">Nenhum e-mail administrativo ativo selecionado</span>
                      )}
                    </div>

                    {/* Suggestions list of emails */}
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Selecione contatos ou motoristas da empresa:</p>
                      <div className="grid gap-2 sm:grid-cols-2 max-h-40 overflow-y-auto p-1 border border-slate-100 rounded-lg bg-white">
                        {emailOptions.map(opt => {
                          const isSelected = selectedEmails.includes(opt.email.toLowerCase());
                          return (
                            <button
                              key={opt.email}
                              type="button"
                              onClick={() => toggleEmail(opt.email)}
                              className={cn(
                                "flex items-center justify-between p-2.5 rounded-lg text-left text-xs border transition-all cursor-pointer",
                                isSelected
                                  ? "bg-primary/10 border-primary text-slate-900 font-semibold"
                                  : "bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100 hover:border-slate-200"
                              )}
                            >
                              <div className="truncate pr-2">
                                <span className="block font-bold truncate text-slate-800">{opt.name}</span>
                                <span className="block text-[10px] text-slate-500 truncate">{opt.email}</span>
                              </div>
                              <div className={cn(
                                "size-4 rounded border flex items-center justify-center transition-all",
                                isSelected 
                                  ? "border-primary bg-primary text-slate-900" 
                                  : "border-slate-300 bg-white"
                              )}>
                                {isSelected && <Check className="size-3 text-slate-900 font-bold" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quick Add Custom Email Field */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input 
                          type="email"
                          placeholder="Adicionar novo e-mail administrativo..."
                          value={customEmailInput}
                          onChange={(e) => setCustomEmailInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomEmail();
                            }
                          }}
                          className="w-full text-xs font-medium text-slate-900 bg-white p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900 pr-10"
                        />
                        <Mail className="absolute right-3.5 top-3.5 size-4 text-slate-400" />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCustomEmail}
                        className="px-4 py-2.5 bg-primary hover:brightness-110 text-slate-900 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
                      >
                        <Plus className="size-4" />
                        Incluir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with save actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={loadConfig}
                className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="size-3.5" />
                Descartar Alterações
              </button>
              
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-primary hover:brightness-110 disabled:bg-slate-400 disabled:cursor-not-allowed text-slate-900 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-primary/20 cursor-pointer"
              >
                {saving ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="size-3.5" />
                    Salvar Dados da Empresa
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Subscriptions Information details */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 p-6">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="size-5 text-slate-400" />
                Ecossistema de Aplicativos
              </h3>
            </div>
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900 shrink-0">
                      <Smartphone className="size-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 tracking-tight">App Mobile (Motoristas)</h4>
                      <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                        Utilizado pelos seus motoristas para o envio de notas fiscais (NF) e registros de odômetro. O sistema extrai automaticamente as informações para este painel.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-lg border border-emerald-100">Ativo</span>
                    <span className="text-xs text-slate-400">• v2.4.1 (Última atualização: Hoje)</span>
                  </div>
                </div>
                
                <div className="flex-1 p-4 bg-slate-900 rounded-2xl text-white relative overflow-hidden group">
                   <div className="relative z-10">
                     <p className="text-[10px] font-bold text-emerald-400 uppercase mb-2">Backoffice</p>
                     <p className="text-sm font-medium mb-4">Acesso exclusivo para monitoramento estratégico da empresa.</p>
                     <div className="flex items-center gap-2 text-xs text-slate-300 font-bold group-hover:text-white transition-colors cursor-default">
                       Painel de Controle Ativo <ChevronRight className="size-4" />
                     </div>
                   </div>
                   <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                     <ShieldCheck className="size-24" />
                   </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Subscription Sidebar */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-emerald-50/30">
              <div className="flex items-center justify-between mb-4">
                <div className="size-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                  <CreditCard className="size-5" />
                </div>
                <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">Assinado</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Plano Enterprise</h3>
              <p className="text-sm text-slate-500 mb-6">Gestão completa para grandes frotas</p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-bold uppercase flex items-center gap-1.5 leading-none">
                    <Calendar className="size-3" /> Próximo Vencimento
                  </span>
                  <span className="text-sm font-bold text-slate-900 font-mono">12 Mai, 2024</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-bold uppercase flex items-center gap-1.5 leading-none">
                    <Smartphone className="size-3" /> Licenças Ativas
                  </span>
                  <span className="text-sm font-bold text-slate-900 font-mono">45 / 50</span>
                </div>
              </div>
              
              <div className="mt-8">
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                   <div className="h-full bg-slate-900 w-[90%]" />
                </div>
                <p className="text-[10px] text-slate-400 mt-2 text-right font-bold">90% da capacidade utilizada</p>
              </div>
            </div>
            
            <div className="p-6 bg-slate-50">
               <button type="button" className="w-full py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer">
                 Gerenciar Faturamento
                 <ExternalLink className="size-3" />
               </button>
            </div>
          </section>

          <section className="p-6 rounded-2xl border border-amber-100 bg-amber-50/50">
            <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2 mb-2">
              <Info className="size-4 animate-bounce" /> Suporte Premium
            </h4>
            <p className="text-xs text-amber-700 leading-relaxed">
              Como assinante Enterprise, você tem acesso prioritário ao nosso time de suporte 24/7.
            </p>
            <button type="button" className="mt-4 text-xs font-bold text-amber-900 hover:underline cursor-pointer">
              Abrir chamado técnico
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};
