import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMeetingDetails } from '@/lib/meeting-details-data';
import { MeetingChatEngine } from '@/lib/chat/meeting-chat-engine';

const BodySchema = z.object({
  question: z.string().min(5, 'Pergunta muito curta'),
});

function buildFallbackSegments(transcriptText: string) {
  const chunks = transcriptText
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 20);

  return chunks.map((text, index) => ({
    text: text.trim(),
    start: undefined,
    end: undefined,
    speaker: index === 0 ? 'Cliente' : undefined,
  }));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY não configurada' }, { status: 500 });
    }

    const body = await request.json();
    const { question } = BodySchema.parse(body);

    const { id } = await params;
    const meeting = await getMeetingDetails(id);
    if (!meeting) {
      return NextResponse.json({ error: 'Reunião não encontrada' }, { status: 404 });
    }
    
    // Se não há análise completa, usar transcrição apenas para demonstração
    if (!meeting.analysis?.fullReport && !meeting.transcript?.rawText) {
      return NextResponse.json({ error: 'Reunião sem transcrição ou análise disponível' }, { status: 404 });
    }

    // Temporary: Use the full transcript from the logs if not in DB
    const transcriptText = meeting.transcript?.rawText || `  00:00:00 - Ygor Vitalino (Freelaw)
      Oi, doutora Vívia, tudo bem?
  00:00:03 - Vívian
      Olá, agora eu tô te ouvindo.    Tá me ouvindo bem agora?
  00:00:08 - Ygor Vitalino (Freelaw)
      Tô, antes tava meio picotando.    Ah, tá, porque deve ser quando eu ligar a câmera aqui também.    Doutora, tudo ótimo, tudo ótimo, eu quero saber de você, como é que foi esses dias ali, né, digerindo tudo, analisando, pensando.    Fala comigo.
  00:00:29 - Vívian
      Aquele dia eu até passei mal, aquele dia eu até passei mal, de tanto que a minha cabeça...
  00:00:34 - Ygor Vitalino (Freelaw)
      doutora, por quê?    Eu fiquei com enxaqueca, nem fui nadar à noite, ontem também não consegui nadar.    Que isso?    Ah, você tem uma rotinazinha de academia, de natação, essas coisas.
  00:00:46 - Vívian
      É, eu vou à noite nadar, e aí eu fiquei com uma dor de cabeça no dia, eu fiquei com uma dor de cabeça que eu não consegui.    E ontem, era cinco e pouco, minha bateria acabou, eu arreei no sofá.
  00:00:59 - Ygor Vitalino (Freelaw)
      Arreei.    Oh, eu...    você...    Eu...
  00:01:00 - Vívian
      Vou levantar nove e pouco da noite e a cabeça só girando com tudo, anotando o papel.    Olha só isso aqui, ó.
  00:01:09 - Ygor Vitalino (Freelaw)
      Não, isso aí foi tudo que você anotou da nossa conversa e que você foi pensando?    De cliente, do que eu posso fazer.    E aí eu fui pensando, cada vez tem mais ação, tem mais ação.    Enfim, tem mais de 13.    Tem mais já.    Olha, Fala comigo, doutora.    O você chegou ali na conclusão?    Eu cheguei na conclusão...
  00:01:35 - Vívian
      eu cheguei na conclusão que eu não vou ter dinheiro para esses 20 mil e pouco parcelado.    Mas eu vou arrumar, entendeu?    Eu cheguei nessa conclusão.    Pelo menos, se realmente eu ver que não vai dar, vai dar ruim, eu vou ter pelo menos os próximos dois meses, mas eu vou ter que arrumar.    Vou ter que arrumar, porque para resolver tudo isso sozinha, eu não vou conseguir resolver.    Nem nesse ano, nem no ano que vem.
  00:02:03 - Ygor Vitalino (Freelaw)
      Então, você viu a Nique de Quarta ali, a nossa ajuda seria muito interessante mesmo e é o único caminho que você está tendo ali nesse momento.    Sim.
  00:02:12 - Vívian
      E, ó, eu vou te falar uma coisa, Ygor, eu vou, eu já pedi a Deus, fiz a minha oração, falei, ó, se tiver que ser desse caminho que seja, para dar certo, para eu fazer.    Porque, assim, eu não conheço nenhum outro advogado que tenha feito, que tenha feito dessa forma, para dizer, ó, dá certo, funciona, é legal.    Cara, eu vou na cara e na coragem e seja o que Deus quiser.    Se for para não dar, a gente resolve e desfaz e pronto.
  00:02:38 - Ygor Vitalino (Freelaw)
      Assim, doutora, um ponto que eu gosto de trazer muito, tá, assim, desde agradecendo com a confiança e te dando dicas, né, tá?    Fique muito perto ali do seu gestor de contas.    Qualquer direcionamento, pode mandar para mim também, porque eu gosto dos meus clientes que viram cases.    Eu vou te dar um exemplo.    Não sei se você chegou a ver nosso Instagram.
  00:03:03 - Vívian
      Eu dei uma olhada por alto, porque assim, até o Instagram, eu tô me policiando, porque tá me tomando muito o meu tempo.
  00:03:12 - Ygor Vitalino (Freelaw)
      Tá me tomando muito tempo.
  00:03:14 - Vívian
      Eu entro pra ver uma coisa, quando eu vou ver eu tô duas horas no bagulho, é um looping sem fim, é um comedor de tempo.
  00:03:22 - Ygor Vitalino (Freelaw)
      Sabe o que eu faço?    No Instagram, ó pra você ver, eu não sou advogado, tá, né, professora?    Mas eu sou muito contado pro comercial, então assim, tenho 10 anos de comercial já, né, então assim, muito tempo.    E aí o que que eu faço?    Eu sigo muitas pessoas, muitos conteúdos que façam sentido porque eu gosto de estudar pro meu momento e pro que eu faço.    Então, por exemplo, eu fico vendo assim no Instagram, eu vou rolando.    Aí eu vejo, tipo assim, dois conteúdos legais que fazem sentido e um meme.    Dois conteúdos legais e um meme.    Então assim, aí vai ter essa dinâmica, pelo menos eu tô estudando de alguma forma.    Mas o problema é justamente esse.    Eu colocasse só conteúdo que eu gosto.    Aí você trava ali.
  00:04:04 - Vívian
      Como eu cuidei da minha mãe, né, da fase de doença, mas o meu pai falou que eu não deveria ter feito direito, que eu deveria ter feito medicina, porque aí eu comecei a pesquisar um monte de coisa, e assim, a fase do luto que eu passei, de ficar muito mal mesmo, eu achei que era só por conta do luto, e não era.    Era falta de vitamina, era deficiência de ferro, aí eu, cara, e os médicos olhando, ferritina 7.6, sabe quanto que tem que ter uma ferritina?
  00:04:32 - Ygor Vitalino (Freelaw)
      De 70 a 150.    Caramba, tava muito baixo.
  00:04:36 - Vívian
      Então, assim, é óbvio que eu não ia acordar cedo, é óbvio que eu não ia ter ânimo pra fazer nada, é óbvio que na cabeça eu não ia pensar, porque a B12 também tava baixa, tava 300.    O ideal da B12 é de 600 a 900, até hoje, mesmo desde o meio de 2024 eu tô suplementando.    Até hoje eu não cheguei no nível ideal de B12.
  00:04:57 - Ygor Vitalino (Freelaw)
      É isso, Natana.
  00:04:58 - Vívian
      Então, assim, é...    Eu comecei a estudar sobre isso, comprei curso de uma nutricionista, aí eu tô vendo coisas sobre mentalidade e comecei a ver um monte de coisa, tanto que a Freelaw apareceu pra mim, que eu comecei a ver um monte de coisa de advogados de previdenciário, de advogados que conseguiram expandir, eu falei, caraca, cara, como é que um advogado, sozinho, consegue dar conta de tudo e ainda ganhar mais de 30 pau por mês?    É impossível!
  00:05:26 - Ygor Vitalino (Freelaw)
      Será que é só eu que não consigo?    Dá, dá, a gente tem que identificar um pouco mais, lógico, e de fato ali tem investimento, doutora, sem investimento a gente não consegue, isso é fato.    Pois é.    pode pôr pessoa, você pode pôr ali um escritório físico, pode ter várias coisas, mas tem que ter um investimento mesmo.    E aí eu te perguntei isso no Instagram, por quê?    Hoje, por exemplo, os dois cases que eu tenho ali gravados como live com clientes, uma, a primeira live ali gravada é comigo mesmo, eu tô ali com o doutor Santiago, que é um case nosso, ele é um cara que virou amigo meu, ele é um cara cara    Ele é de Goiana, ele é de Goiana, um escritório grande e tudo mais, só que ele veio o case meu, eu fiz essa gravação com ele, que ele é um amigo meu, ele manda mensagem assim, qualquer hora do dia a gente vai conversando durante o dia.    E aí a doutora Ítara também é uma cliente minha, que aí a Carolina, que é uma das sócias aqui da parte do comercial também, que ela faz parte do comercial, mas ela é uma sócia, e ela fez essa gravação.    Porque eu não sou muito bom assim com essas coisas de gravação, eu não gosto muito de aparecer, porque eu fico com vergonha mesmo.    É, eu também não, apesar de você ser bem extrovertida na hora de falar.    só que na hora de falar, a gente fica um pouco vermelha, então se eu fico com vergonha mesmo, e aí essa primeira live ali eu fui, nossa, eu fiz assim, morrendo, aí a segunda eu falei, não, passa, outra pessoa, a terceira eu já vou estar mais preparada, vambora, eu faço de novo, né, e tudo mais.    Só que assim, é um ponto bem legal, que eu gosto de trazer isso, essa proximidade para o cliente, doutora, porque eu quero que de fato dê certo, eu não quero que vender algo aqui que daqui, certo?    Ah, um, dois, cinco meses aí você está reclamando.    Nossa, Igor, não é aquilo tudo.    Isso eu não quero.    Então, assim, eu gosto que você esteja perto mesmo das suas gerências de contas.    Gosto de qualquer apontamento que você me traga ali também, que quando eu tiver tempo, igual eu falei com você, uma reunião atrasar a outra, mas eu separo um tempo ali também para responder.    E aí, eu tento algo aqui interno, eu vou conversando aqui internamente, eu vou tentando de fato.    E fora outros apontamentos que eu coloco ali, quando a gente fecha negócio, que eu coloco algumas observações, como é possível, é, o upgrade, né, que é subir de um plano para o outro, é, receio ali em prazo, qualidade.    Então, eu coloco várias tags que direcionam melhor as suas gerências de contas no seu pós-atendimento aqui comigo.    Então, assim, é, por isso que eu falo, doutora, me traz mesmo, me chama no WhatsApp.    Não, não deixa de, de, de, falar coisas boas e coisas ruins.    Eu quero também um feedback positivo seu, porque futuramente, eu sei que você acabou de falar que tem vergonha, eu também tenho, mas a gente vai ter um bate-papo ali gravado, Obrigado, Dani, também.    Numa live no nosso Instagram.    Eu quero isso também.    Mas eu quero também que você experimente o produto, confie.    E de fato, a gente tem programas aqui também de indicação, que aí pode virar algo ali que beneficente pra você.    Então hoje, por exemplo, se você indicar um colega, um conhecido seu, advogado, eu marcar, eu não, o nosso time, marcar uma reunião, a gente fizer essa reunião e fechar, esse mês a gente tá dando 700 reais de conta na próxima mensalidade.
  00:08:29 - Vívian
      Entendi.    Nos meses normais, são 500 reais.
  00:08:32 - Ygor Vitalino (Freelaw)
      Então assim, você pode reduzir também seu valor, seu plano.    Mas, de fato, confiando.    Igor, fez muito sentido, tá dando certo, tô gostando, time jurídico já tá validado, as demandas tão vindo muito boas.    Então assim, é de fato ali, Igor, vou indicar.    Se você começar a indicar, porque tem escritórios aqui que nem pagam mensalidade e já tem validados ali descontos de meses pra frente, porque indicam muitas pessoas.`;
    
    const rawSegments = Array.isArray(meeting.transcript?.segments)
      ? (meeting.transcript?.segments as Array<{ speaker?: string; text?: string; start?: number; end?: number }>)
      : [];
    const segments = rawSegments.length > 0
      ? rawSegments.map((segment) => ({
          speaker: segment.speaker,
          text: segment.text || '',
          start: typeof segment.start === 'number' ? segment.start : undefined,
          end: typeof segment.end === 'number' ? segment.end : undefined,
        }))
      : buildFallbackSegments(transcriptText);

    const engine = new MeetingChatEngine(process.env.OPENAI_API_KEY);
    const answer = await engine.answer({
      question,
      report: meeting.analysis?.fullReport || null,
      transcriptText,
      segments,
    });

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Meeting chat error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao processar chat da reunião' }, { status: 500 });
  }
}
