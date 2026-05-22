import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Loader2, FileText, BookOpen, Send, Award, BarChart3, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface EvaluationResult {
  criterionA: { score: number; feedback: string };
  criterionB: { score: number; feedback: string };
  criterionC: { score: number; feedback: string };
  criterionD: { score: number; feedback: string };
  overallFeedback: string;
  totalScore: number;
}

const CriterionCard = ({ title, description, result, maxScore }: { title: string, description: string, result: { score: number, feedback: string }, maxScore: number }) => {
  const percentage = maxScore > 0 ? (result.score / maxScore) * 100 : 0;
  let colorClass = "bg-red-500";
  if (percentage >= 80) colorClass = "bg-green-500";
  else if (percentage >= 60) colorClass = "bg-yellow-500";
  else if (percentage >= 40) colorClass = "bg-orange-500";

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm mb-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-2xl font-bold text-gray-900">{result.score.toFixed(1).replace(/\.0$/, '')}<span className="text-sm text-gray-400 font-normal">/{maxScore}</span></div>
        </div>
      </div>
      
      <div className="w-full bg-gray-100 rounded-full h-2 mb-4 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-2 rounded-full ${colorClass}`} 
        />
      </div>
      
      <div className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-4 rounded-lg">
        {result.feedback}
      </div>
    </div>
  );
};

export default function App() {
  const [paperType, setPaperType] = useState<'paper1' | 'paper2'>('paper1');
  const [evalScope, setEvalScope] = useState<'full' | 'intro' | 'body'>('full');
  const [essay, setEssay] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [level, setLevel] = useState<'SL' | 'HL'>('SL');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  let maxA: number, maxB: number, maxC: number, maxD: number, maxTotal: number;
  
  if (evalScope === 'intro') {
    maxA = 2; maxB = 1; maxC = 1; maxD = 1; maxTotal = 5;
  } else if (evalScope === 'body') {
    maxA = 3; maxB = 3; maxC = 2; maxD = 2; maxTotal = 10;
  } else {
    maxA = paperType === 'paper1' ? 5 : 10;
    maxB = paperType === 'paper1' ? 5 : 10;
    maxC = 5;
    maxD = 5;
    maxTotal = paperType === 'paper1' ? 20 : 30;
  }

  const handleEvaluate = async () => {
    if (!essay.trim()) {
      setError('Lütfen değerlendirilecek bir metin girin.');
      return;
    }

    setIsEvaluating(true);
    setError(null);
    setResult(null);

    try {
      let prompt = '';
      const scopeText = evalScope === 'intro' ? 'SADECE GİRİŞ PARAGRAFI' : evalScope === 'body' ? 'SADECE BİR GELİŞME PARAGRAFI' : 'TAM METİN';
      const scopeInstruction = evalScope === 'intro' 
        ? `Bu bir Giriş Paragrafıdır. Lütfen değerlendirmeyi bu bölümün gerekliliklerine (metnin tanıtımı, bağlam, tez cümlesi, yol haritası vb.) göre yap. TOPLAM PUAN: ${maxTotal}. Kriter Kısıtlamaları (VİRGÜLLÜ/BONDALIKLI puanlar verilebilir, örn: 1.5, 0.8): A: 0-${maxA}, B: 0-${maxB}, C: 0-${maxC}, D: 0-${maxD}.` 
        : evalScope === 'body' 
        ? `Bu bir Gelişme Paragrafıdır. Lütfen değerlendirmeyi bu bölümün gerekliliklerine (konu cümlesi, kanıt, analiz, teze bağlama vb.) göre yap. TOPLAM PUAN: ${maxTotal}. Kriter Kısıtlamaları (VİRGÜLLÜ/BONDALIKLI puanlar verilebilir, örn: 2.5, 1.2): A: 0-${maxA}, B: 0-${maxB}, C: 0-${maxC}, D: 0-${maxD}.`
        : `Lütfen değerlendirmeyi resmi IB kriterlerine göre yap. TOPLAM PUAN: ${maxTotal}. Kriter Kısıtlamaları: A: 0-${maxA}, B: 0-${maxB}, C: 0-${maxC}, D: 0-${maxD}. (Tam metin değerlendirmesinde genellikle tam puanlar tercih edilir ancak gerekirse virgüllü puan verilebilir).`;

      if (paperType === 'paper1') {
        prompt = `
Lütfen aşağıdaki IB Türkçe A (Edebiyat veya Dil ve Edebiyat) Kağıt 1 (Paper 1) denemesini resmi IB kriterlerine göre değerlendir.
Değerlendirme Kapsamı: ${scopeText}
Seviye: ${level} (High Level / Standard Level)
${scopeInstruction}

Öğrenci Metni:
${essay}

${sourceText ? `Kaynak Metin (Öğrencinin analiz ettiği metin):\n${sourceText}` : 'Kaynak metin sağlanmadı. Lütfen öğrenci metninden yola çıkarak değerlendirme yap.'}

Değerlendirme Kriterleri:
Kriter A: Anlama ve yorumlama (0-${maxA} puan)
Kriter B: Analiz ve değerlendirme (0-${maxB} puan)
Kriter C: Odaklanma ve organizasyon (0-${maxC} puan)
Kriter D: Dil (0-${maxD} puan)

Lütfen her bir kriter için belirtilen aralıkta bir puan ver (4.5 gibi virgüllü puanlar verebilirsin) ve bu puanın nedenini açıklayan detaylı, yapıcı bir geri bildirim yaz. Ayrıca genel bir değerlendirme ve gelişim tavsiyeleri sun.
`;
      } else {
        prompt = `
Lütfen aşağıdaki IB Türkçe A (Edebiyat veya Dil ve Edebiyat) Kağıt 2 (Paper 2) karşılaştırmalı denemesini resmi IB kriterlerine göre değerlendir.
Değerlendirme Kapsamı: ${scopeText}
Seviye: ${level} (High Level / Standard Level)
${scopeInstruction}

Öğrenci Metni:
${essay}

${sourceText ? `Soru ve İncelenen Eserler:\n${sourceText}` : 'Soru ve eser bilgisi sağlanmadı. Lütfen öğrenci metninden yola çıkarak değerlendirme yap.'}

Değerlendirme Kriterleri:
Kriter A: Bilgi, anlama ve yorumlama (0-${maxA} puan)
Kriter B: Analiz ve değerlendirme (0-${maxB} puan)
Kriter C: Odaklanma ve organizasyon (0-${maxC} puan)
Kriter D: Dil (0-${maxD} puan)

Lütfen her bir kriter için belirtilen aralıkta bir puan ver (4.5 gibi virgüllü puanlar verebilirsin) ve bu puanın nedenini açıklayan detaylı, yapıcı bir geri bildirim yaz. Ayrıca genel bir değerlendirme ve gelişim tavsiyeleri sun.
`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              criterionA: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.NUMBER, description: `0-${maxA} arası puan` },
                  feedback: { type: Type.STRING, description: "Kriter A için detaylı Türkçe geri bildirim" }
                },
                required: ["score", "feedback"]
              },
              criterionB: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.NUMBER, description: `0-${maxB} arası puan` },
                  feedback: { type: Type.STRING, description: "Kriter B için detaylı Türkçe geri bildirim" }
                },
                required: ["score", "feedback"]
              },
              criterionC: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.NUMBER, description: `0-${maxC} arası puan` },
                  feedback: { type: Type.STRING, description: "Kriter C için detaylı Türkçe geri bildirim" }
                },
                required: ["score", "feedback"]
              },
              criterionD: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.NUMBER, description: `0-${maxD} arası puan` },
                  feedback: { type: Type.STRING, description: "Kriter D için detaylı Türkçe geri bildirim" }
                },
                required: ["score", "feedback"]
              },
              overallFeedback: {
                type: Type.STRING,
                description: "Genel değerlendirme ve gelişim tavsiyeleri"
              },
              totalScore: {
                type: Type.NUMBER,
                description: `Toplam puan (0-${maxTotal})`
              }
            },
            required: ["criterionA", "criterionB", "criterionC", "criterionD", "overallFeedback", "totalScore"]
          }
        }
      });

      const jsonStr = response.text?.trim();
      if (jsonStr) {
        const parsedResult = JSON.parse(jsonStr) as EvaluationResult;
        setResult(parsedResult);
      } else {
        throw new Error("Boş yanıt alındı.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Değerlendirme sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans text-gray-900 selection:bg-blue-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm">
              <BookOpen size={20} />
            </div>
            <h1 className="font-serif font-bold text-xl text-gray-900 tracking-tight">IB Türkçe A Değerlendirici</h1>
          </div>
          <div className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full uppercase tracking-wider">
            {paperType === 'paper1' ? 'Kağıt 1 (Paper 1)' : 'Kağıt 2 (Paper 2)'}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-serif font-semibold mb-5 flex items-center gap-2 text-gray-800">
                <FileText size={20} className="text-blue-600" />
                Metin Girişi
              </h2>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sınav (Paper)</label>
                  <div className="flex bg-gray-100 p-1.5 rounded-xl">
                    <button
                      onClick={() => setPaperType('paper1')}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${paperType === 'paper1' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Kağıt 1 (Paper 1)
                    </button>
                    <button
                      onClick={() => setPaperType('paper2')}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${paperType === 'paper2' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Kağıt 2 (Paper 2)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Değerlendirme Kapsamı</label>
                  <div className="flex bg-gray-100 p-1.5 rounded-xl gap-1">
                    <button
                      onClick={() => setEvalScope('full')}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${evalScope === 'full' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Tam Metin
                    </button>
                    <button
                      onClick={() => setEvalScope('intro')}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${evalScope === 'intro' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Giriş Par.
                    </button>
                    <button
                      onClick={() => setEvalScope('body')}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${evalScope === 'body' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Gelişme Par.
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Seviye (Level)</label>
                  <div className="flex bg-gray-100 p-1.5 rounded-xl">
                    <button
                      onClick={() => setLevel('SL')}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${level === 'SL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Standart Seviye (SL)
                    </button>
                    <button
                      onClick={() => setLevel('HL')}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${level === 'HL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      İleri Seviye (HL)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {paperType === 'paper1' ? 'Kaynak Metin' : 'Soru ve Eserler'} <span className="text-gray-400 font-normal">(İsteğe bağlı)</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    {paperType === 'paper1' 
                      ? 'Öğrencinin analiz ettiği orijinal metni buraya yapıştırabilirsiniz.' 
                      : 'Öğrencinin cevapladığı soruyu ve incelediği eserlerin adlarını buraya yazabilirsiniz.'}
                  </p>
                  <textarea
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    className="w-full h-32 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-sm placeholder:text-gray-400"
                    placeholder={paperType === 'paper1' ? "Kaynak metni buraya yapıştırın..." : "Soru: ...\nEser 1: ...\nEser 2: ..."}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Öğrenci Metni <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    {evalScope === 'intro' ? 'Öğrencinin yazdığı giriş paragrafını buraya yapıştırın.' : evalScope === 'body' ? 'Öğrencinin yazdığı bir gelişme paragrafını buraya yapıştırın.' : `Öğrencinin yazdığı ${paperType === 'paper1' ? 'Kağıt 1 analizini' : 'Kağıt 2 karşılaştırmalı denemesini'} buraya yapıştırın.`}
                  </p>
                  <textarea
                    value={essay}
                    onChange={(e) => setEssay(e.target.value)}
                    className="w-full h-64 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-sm placeholder:text-gray-400"
                    placeholder={evalScope === 'intro' ? "Giriş paragrafını buraya yapıştırın..." : evalScope === 'body' ? "Gelişme paragrafını buraya yapıştırın..." : "Öğrenci metnini buraya yapıştırın..."}
                  />
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-600 text-sm"
                  >
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <p>{error}</p>
                  </motion.div>
                )}

                <button
                  onClick={handleEvaluate}
                  disabled={isEvaluating || !essay.trim()}
                  className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.98]"
                >
                  {isEvaluating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Değerlendiriliyor...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Değerlendir
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {!isEvaluating && !result && (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50"
                >
                  <div className="bg-white p-5 rounded-full mb-5 shadow-sm border border-gray-100 text-gray-400">
                    <BarChart3 size={40} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-serif font-medium text-gray-900 mb-2">Değerlendirme Bekleniyor</h3>
                  <p className="text-gray-500 max-w-sm text-sm leading-relaxed">
                    Öğrenci metnini sol taraftaki alana yapıştırın ve "Değerlendir" butonuna tıklayarak detaylı IB kriter analizini görün.
                  </p>
                </motion.div>
              )}

              {isEvaluating && (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-200"
                >
                  <div className="relative mb-8">
                    <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                    <div className="relative bg-blue-600 text-white p-5 rounded-full shadow-lg">
                      <Loader2 size={36} className="animate-spin" />
                    </div>
                  </div>
                  <h3 className="text-xl font-serif font-medium text-gray-900 mb-3">Yapay Zeka Analiz Ediyor</h3>
                  <p className="text-gray-500 max-w-sm text-sm leading-relaxed">
                    Metin okunuyor, IB kriterlerine göre değerlendiriliyor ve geri bildirimler oluşturuluyor. Bu işlem birkaç saniye sürebilir...
                  </p>
                </motion.div>
              )}

              {result && !isEvaluating && (
                <motion.div 
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Score Overview Card */}
                  <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col sm:flex-row items-center gap-8">
                    <div className="relative flex items-center justify-center shrink-0">
                      <svg className="w-36 h-36 transform -rotate-90">
                        <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                        <motion.circle 
                          initial={{ strokeDashoffset: 2 * Math.PI * 64 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 64 * (1 - result.totalScore / maxTotal) }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          cx="72" cy="72" r="64" 
                          stroke="currentColor" 
                          strokeWidth="8" 
                          fill="transparent" 
                          strokeDasharray={2 * Math.PI * 64} 
                          className={`${result.totalScore >= maxTotal * 0.8 ? 'text-green-500' : result.totalScore >= maxTotal * 0.6 ? 'text-blue-500' : result.totalScore >= maxTotal * 0.4 ? 'text-yellow-500' : 'text-orange-500'}`} 
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold text-gray-900">{result.totalScore.toFixed(1).replace(/\.0$/, '')}</span>
                        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">/ {maxTotal}</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 text-center sm:text-left">
                      <h2 className="text-2xl font-serif font-bold text-gray-900 mb-3">Değerlendirme Sonucu</h2>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        Bu deneme, IB Türkçe A {paperType === 'paper1' ? 'Kağıt 1' : 'Kağıt 2'} kriterlerine göre değerlendirilmiştir. Aşağıda her bir kriter için detaylı puanlama ve gelişim tavsiyelerini bulabilirsiniz.
                      </p>
                    </div>
                  </div>

                  {/* Criteria Breakdown */}
                  <div className="space-y-4">
                    <CriterionCard 
                      title={paperType === 'paper1' ? "Kriter A: Anlama ve Yorumlama" : "Kriter A: Bilgi, Anlama ve Yorumlama"}
                      description={paperType === 'paper1' ? "Metnin ne anlama geldiğini ve yazarın amacını anlama" : "Eserler hakkında bilgi, sorunun içerik ve çıkarımlarına dair anlama"}
                      result={result.criterionA} 
                      maxScore={maxA}
                    />
                    <CriterionCard 
                      title="Kriter B: Analiz ve Değerlendirme" 
                      description={paperType === 'paper1' ? "Yazarın dil, yapı, teknik ve stil özelliklerini analiz etme" : "Yazarın seçimlerinin anlamı nasıl oluşturduğu ve eserlerin karşılaştırılması"}
                      result={result.criterionB} 
                      maxScore={maxB}
                    />
                    <CriterionCard 
                      title="Kriter C: Odaklanma ve Organizasyon" 
                      description="Argümanın sunumu, yapısı ve mantıksal gelişimi"
                      result={result.criterionC} 
                      maxScore={maxC}
                    />
                    <CriterionCard 
                      title="Kriter D: Dil" 
                      description="Kelime dağarcığı, dilbilgisi, ifade açıklığı ve akademik dil kullanımı"
                      result={result.criterionD} 
                      maxScore={maxD}
                    />
                  </div>

                  {/* Overall Feedback */}
                  <div className="bg-blue-50 p-6 sm:p-8 rounded-2xl border border-blue-100 shadow-sm">
                    <h3 className="font-serif font-bold text-blue-900 text-xl mb-4 flex items-center gap-2">
                      <Award size={24} className="text-blue-600" />
                      Genel Değerlendirme ve Tavsiyeler
                    </h3>
                    <div className="text-blue-800 text-sm leading-relaxed whitespace-pre-wrap">
                      {result.overallFeedback}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
