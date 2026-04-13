/**
 * Gene Structure & Regulation Curriculum Module
 *
 * Eight experiments covering gene anatomy, splicing, promoters,
 * transcription factors, and the ABC model of flower development:
 *  0. The Anatomy of a Gene (interactive gene diagram)
 *  1. Exons vs Introns — Splicing
 *  2. From Gene to mRNA — The Full Processing Pipeline
 *  3. Promoters — Where Expression Begins
 *  4. Transcription Factors — Proteins That Read DNA
 *  5. The ABC Model of Flower Development
 *  6. Protein Structure Determines DNA Binding
 *  7. From Sequence to Phenotype — The Full Loop
 *
 * Plant example: Arabidopsis AGAMOUS (AG), a MADS-box transcription factor
 * controlling stamen and carpel identity (Yanofsky et al. 1990, Nature).
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  AG_GENE_MODEL,
  REGION_COLORS,
  SPLICING_EXERCISE,
  CARG_EXERCISE_SEQUENCE,
  PROMOTER_EXERCISE_SEQUENCE,
  findCArgBoxes,
  MADS_DOMAIN_SEQUENCE,
  flowerPhenotype,
  ORGAN_COLORS,
  ORGAN_LABELS,
  type GeneRegion,
  type GeneRegionType,
  type AbcState,
  type FlowerOrgan,
} from './genereg-engine';
import {
  ModuleShell, QuestionPanel,
  type ModuleDefinition,
} from './components';

// ── Shared helpers ────────────────────────────────────────────────────

function OptionButton({ label, selected, correct, onClick, disabled }: {
  label: string;
  selected: boolean;
  correct?: boolean | null;
  onClick: () => void;
  disabled?: boolean;
}) {
  let classes = 'w-full text-left rounded-lg border-2 px-4 py-3 text-sm transition-all ';
  if (correct === true && selected) {
    classes += 'border-emerald-400 bg-emerald-50 text-emerald-800 font-semibold';
  } else if (correct === false && selected) {
    classes += 'border-red-300 bg-red-50 text-red-800';
  } else if (selected) {
    classes += 'border-indigo-400 bg-indigo-50 text-indigo-800';
  } else {
    classes += 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50';
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={classes}>
      {label}
    </button>
  );
}

// ── Gene Diagram Component (shared across experiments) ──────────────────

function GeneDiagram({ regions, highlightTypes, onRegionClick, selectedRegion }: {
  regions: GeneRegion[];
  highlightTypes?: GeneRegionType[];
  onRegionClick?: (region: GeneRegion) => void;
  selectedRegion?: GeneRegion | null;
}) {
  const totalLength = Math.max(...regions.map(r => r.end));
  const svgWidth = 800;
  const svgHeight = 120;
  const trackY = 50;
  const trackH = 30;
  const scale = (svgWidth - 40) / totalLength;

  // Group regions by rendering layer: background (upstream, promoter, UTRs),
  // then exons/introns, then overlay elements (TATA, codons, CArG boxes)
  const bgTypes: GeneRegionType[] = ['upstream', 'promoter', '5utr', '3utr'];
  const mainTypes: GeneRegionType[] = ['exon', 'intron'];
  const overlayTypes: GeneRegionType[] = ['tata-box', 'start-codon', 'stop-codon', 'poly-a-signal', 'carg-box'];

  const renderRegion = (r: GeneRegion, i: number) => {
    const x = 20 + (r.start - 1) * scale;
    const w = Math.max((r.end - r.start + 1) * scale, 4);
    const isHighlighted = highlightTypes?.includes(r.type);
    const isSelected = selectedRegion === r;
    const isOverlay = overlayTypes.includes(r.type);
    const y = isOverlay ? trackY - 4 : trackY;
    const h = isOverlay ? trackH + 8 : mainTypes.includes(r.type) ? trackH : trackH - 8;
    const yOff = mainTypes.includes(r.type) ? 0 : 4;

    return (
      <g key={`${r.type}-${r.start}-${i}`}
        onClick={() => onRegionClick?.(r)}
        style={{ cursor: onRegionClick ? 'pointer' : 'default' }}
      >
        <rect
          x={x} y={y + yOff} width={w} height={h - yOff * 2}
          rx={isOverlay ? 3 : 2}
          fill={REGION_COLORS[r.type]}
          stroke={isSelected ? '#1e1b4b' : isHighlighted ? '#4f46e5' : 'none'}
          strokeWidth={isSelected ? 2.5 : isHighlighted ? 1.5 : 0}
          opacity={highlightTypes && !isHighlighted && !isSelected ? 0.3 : 1}
        />
        {/* Intron hatching */}
        {r.type === 'intron' && (
          <>
            {Array.from({ length: Math.floor(w / 8) }).map((_, j) => (
              <line key={j}
                x1={x + j * 8 + 2} y1={y + 2}
                x2={x + j * 8 + 6} y2={y + trackH - 2}
                stroke="#d1d5db" strokeWidth={1}
              />
            ))}
          </>
        )}
      </g>
    );
  };

  // Sort regions by layer for rendering
  const bgRegions = regions.filter(r => bgTypes.includes(r.type));
  const mainRegions = regions.filter(r => mainTypes.includes(r.type));
  const overlayRegions = regions.filter(r => overlayTypes.includes(r.type));

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full min-w-[600px]">
        {/* Baseline track */}
        <line x1={20} y1={trackY + trackH / 2} x2={svgWidth - 20} y2={trackY + trackH / 2}
          stroke="#d4d4d8" strokeWidth={1} />

        {/* Render layers */}
        {bgRegions.map(renderRegion)}
        {mainRegions.map(renderRegion)}
        {overlayRegions.map(renderRegion)}

        {/* Scale labels */}
        <text x={20} y={trackY + trackH + 18} fontSize={9} fill="#78716c">1</text>
        <text x={svgWidth - 20} y={trackY + trackH + 18} fontSize={9} fill="#78716c" textAnchor="end">
          {totalLength} bp
        </text>

        {/* Direction arrow */}
        <text x={svgWidth / 2} y={18} fontSize={10} fill="#78716c" textAnchor="middle">
          5' &rarr; 3' (sense strand)
        </text>
      </svg>
    </div>
  );
}

function RegionTooltip({ region }: { region: GeneRegion }) {
  const descriptions: Record<GeneRegionType, string> = {
    upstream: 'Upstream regulatory region: contains enhancer elements and transcription factor binding sites that control when and where the gene is expressed.',
    promoter: 'Core promoter: the region where the transcription machinery assembles. Contains the TATA box and other elements recognized by general transcription factors.',
    'tata-box': 'TATA box (consensus: TATAAA): located ~25 bp upstream of the transcription start site. Recognized by TATA-binding protein (TBP), which helps position RNA Polymerase II.',
    '5utr': "5' untranslated region: transcribed into mRNA but not translated into protein. Contains signals for ribosome binding and translation initiation.",
    exon: 'Exon: a coding region that is retained in the mature mRNA after splicing. Exons encode the amino acid sequence of the protein.',
    intron: 'Intron: a non-coding intervening sequence that is removed from the pre-mRNA by the spliceosome. Intron boundaries follow the GT...AG rule.',
    '3utr': "3' untranslated region: transcribed but not translated. Contains signals for mRNA stability, localization, and polyadenylation.",
    'poly-a-signal': 'Poly-A signal (AATAAA): directs cleavage and polyadenylation of the mRNA ~20 bp downstream. The poly-A tail protects the mRNA from degradation.',
    'start-codon': 'Start codon (ATG/AUG): signals the ribosome to begin translation. Encodes methionine, the first amino acid in the protein.',
    'stop-codon': 'Stop codon (TGA/UGA, TAA/UAA, or TAG/UAG): signals the ribosome to stop translation. Does not encode an amino acid.',
    'carg-box': 'CArG box (consensus: CC[A/T]\u2086GG): a 10 bp DNA motif recognized by MADS-domain transcription factors like AGAMOUS. The name comes from the CC-A-rich-GG pattern.',
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-md p-4 mt-2">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: REGION_COLORS[region.type] }} />
        <span className="font-bold text-sm text-stone-800">{region.label}</span>
        <span className="text-xs text-stone-400">({region.start}..{region.end})</span>
      </div>
      {region.sequence && (
        <div className="font-mono text-xs text-stone-500 mb-2 bg-stone-50 rounded px-2 py-1 inline-block">
          {region.sequence}
        </div>
      )}
      <p className="text-sm text-stone-600">{descriptions[region.type]}</p>
    </div>
  );
}

// ── Gene region legend ──────────────────────────────────────────────────

function RegionLegend({ types }: { types: GeneRegionType[] }) {
  const labels: Record<GeneRegionType, string> = {
    upstream: 'Upstream regulatory',
    promoter: 'Promoter',
    'tata-box': 'TATA box',
    '5utr': "5' UTR",
    exon: 'Exon',
    intron: 'Intron',
    '3utr': "3' UTR",
    'poly-a-signal': 'Poly-A signal',
    'start-codon': 'Start codon',
    'stop-codon': 'Stop codon',
    'carg-box': 'CArG box',
  };
  return (
    <div className="flex flex-wrap gap-3 text-xs text-stone-600">
      {types.map(t => (
        <div key={t} className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: REGION_COLORS[t] }} />
          <span>{labels[t]}</span>
        </div>
      ))}
    </div>
  );
}

// ── Experiment 0: The Anatomy of a Gene ─────────────────────────────────

function Exp0_GeneAnatomy({ onComplete }: { onComplete: () => void }) {
  const [selectedRegion, setSelectedRegion] = useState<GeneRegion | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (submitted && answer === 'b' && !completedRef.current) {
      completedRef.current = true;
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [submitted, answer, onComplete]);

  return (
    <div className="space-y-6">
      {/* Historical framing */}
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-5">
        <p className="font-['Patrick_Hand'] text-lg text-stone-600 mb-3">DISCOVERING GENE ARCHITECTURE</p>
        <div className="text-sm text-stone-600 space-y-3">
          <p>
            By the 1970s, molecular biologists had discovered something surprising: genes in eukaryotes
            are not continuous stretches of coding DNA. They are interrupted by non-coding sequences
            called <strong>introns</strong>, and the actual protein-coding information is split across
            multiple <strong>exons</strong>. This was so unexpected that it earned Phillip Sharp and
            Richard Roberts the 1993 Nobel Prize in Physiology or Medicine.
          </p>
          <p>
            But a gene is more than just exons and introns. A complete eukaryotic gene includes regulatory
            regions that control <em>when</em> and <em>where</em> it is expressed, untranslated regions
            that affect mRNA stability, and signals for RNA processing. Let us explore the anatomy of a
            real plant gene: <strong>AGAMOUS</strong> from <em>Arabidopsis thaliana</em>, which controls
            flower organ identity.
          </p>
        </div>
      </div>

      {/* Interactive gene diagram */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <h3 className="text-sm font-bold text-stone-700 mb-3">
          AGAMOUS Gene Structure — Click any region to learn about it
        </h3>
        <GeneDiagram
          regions={AG_GENE_MODEL}
          onRegionClick={setSelectedRegion}
          selectedRegion={selectedRegion}
        />
        <div className="mt-3">
          <RegionLegend types={[
            'upstream', 'promoter', 'tata-box', '5utr', 'exon', 'intron',
            '3utr', 'poly-a-signal', 'start-codon', 'stop-codon', 'carg-box',
          ]} />
        </div>
        {selectedRegion && <RegionTooltip region={selectedRegion} />}
      </div>

      {/* Question */}
      <QuestionPanel
        question="Which parts of this gene actually encode the protein?"
        correct={submitted ? answer === 'b' : null}
        feedback={submitted ? (
          answer === 'b'
            ? 'Correct! Only the exon sequences between the start codon (ATG) and the stop codon are translated into protein. The promoter controls expression, the UTRs are transcribed but not translated, and the introns are spliced out before translation.'
            : 'Not quite. Remember: introns are removed, UTRs are not translated, and the promoter is never transcribed. Only the exons, from the start codon to the stop codon, encode the protein.'
        ) : undefined}
      >
        <div className="space-y-2">
          {[
            { id: 'a', text: 'The entire gene from promoter to poly-A signal' },
            { id: 'b', text: 'Only the exons, from the start codon to the stop codon' },
            { id: 'c', text: 'Everything between the transcription start and the poly-A signal' },
            { id: 'd', text: 'Only the introns' },
          ].map(opt => (
            <OptionButton
              key={opt.id}
              label={`(${opt.id}) ${opt.text}`}
              selected={answer === opt.id}
              correct={submitted ? (opt.id === 'b' ? answer === 'b' : answer === opt.id ? false : null) : null}
              onClick={() => { if (!submitted) setAnswer(opt.id); }}
              disabled={submitted}
            />
          ))}
        </div>
        {answer && !submitted && (
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            className="mt-3 px-6 py-2 bg-indigo-700 text-white rounded-lg text-sm font-bold hover:bg-indigo-800 transition-colors"
          >
            Submit
          </button>
        )}
      </QuestionPanel>
    </div>
  );
}

// ── Experiment 1: Exons vs Introns — Splicing ───────────────────────────

function Exp1_Splicing({ onComplete }: { onComplete: () => void }) {
  const { premrna, introns, exonRanges, matureMrna } = SPLICING_EXERCISE;
  const [spliced, setSpliced] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const completedRef = useRef(false);

  // Track which GT/AG positions the student has clicked
  const [clickedPositions, setClickedPositions] = useState<number[]>([]);

  const handleBaseClick = useCallback((pos: number) => {
    if (spliced) return;
    const seq = premrna;
    // Check if this position is the start of GT or AG
    const isGT = pos < seq.length - 1 && seq[pos] === 'G' && seq[pos + 1] === 'U';
    const isAG = pos > 0 && seq[pos - 1] === 'A' && seq[pos] === 'G';
    const actualPos = isGT ? pos : isAG ? pos - 1 : -1;

    if (actualPos === -1) return;

    setClickedPositions(prev => {
      if (prev.includes(actualPos)) return prev.filter(p => p !== actualPos);
      return [...prev, actualPos];
    });
  }, [spliced, premrna]);

  // Check if the student has identified both intron boundaries correctly
  const canSplice = useMemo(() => {
    // We need GT at the start of each intron and AG at the end
    // Intron 1: starts at 18 (GT), ends at 34 (AG at pos 34-35)
    // Intron 2: starts at 54 (GT), ends at 70 (AG at pos 70-71)
    const needed = new Set([18, 34, 54, 70]);
    return needed.size === clickedPositions.filter(p => needed.has(p)).length;
  }, [clickedPositions]);

  const handleSplice = useCallback(() => {
    setSpliced(true);
  }, []);

  useEffect(() => {
    if (submitted && answer === 'a' && !completedRef.current) {
      completedRef.current = true;
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [submitted, answer, onComplete]);

  // Render the pre-mRNA sequence with color coding
  const renderSequence = (seq: string, showIntrons: boolean) => {
    const chars = seq.split('');
    return (
      <div className="font-mono text-xs flex flex-wrap gap-0 leading-relaxed">
        {chars.map((base, i) => {
          const isIntron = introns.some(int => i >= int.start && i < int.end);
          const isExon = exonRanges.some(ex => i >= ex.start && i < ex.end);
          const isSpliceSite = (
            // GT at intron start
            introns.some(int => i === int.start || i === int.start + 1) ||
            // AG at intron end
            introns.some(int => i === int.end - 2 || i === int.end - 1)
          );
          const isClicked = clickedPositions.some(p => i === p || i === p + 1);

          let bg = '';
          let textColor = 'text-stone-600';
          if (showIntrons && isIntron) {
            bg = 'bg-stone-200';
            textColor = 'text-stone-400';
          } else if (isExon) {
            bg = 'bg-indigo-100';
            textColor = 'text-indigo-800';
          }
          if (isSpliceSite && isIntron) {
            bg = isClicked ? 'bg-orange-300' : 'bg-orange-100';
            textColor = 'text-orange-800';
          }

          return (
            <span
              key={i}
              onClick={() => handleBaseClick(i)}
              className={`inline-block w-4 text-center py-0.5 cursor-pointer hover:bg-indigo-200 transition-colors ${bg} ${textColor} ${
                i % 3 === 0 && i > 0 ? 'ml-0.5' : ''
              }`}
            >
              {base}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-5">
        <div className="text-sm text-stone-600 space-y-3">
          <p>
            Before an mRNA can be translated into protein, <strong>introns</strong> must be removed
            and the remaining <strong>exons</strong> joined together. This process is called
            <strong> splicing</strong>, and it is carried out by a large molecular machine called
            the <strong>spliceosome</strong>.
          </p>
          <p>
            The spliceosome recognizes intron boundaries by two conserved dinucleotide signals:
            <strong> GT</strong> (GU in RNA) at the 5&apos; splice site and <strong>AG</strong> at
            the 3&apos; splice site. This is called the <strong>GT-AG rule</strong>.
          </p>
          <p>
            Below is a simplified pre-mRNA sequence from the AGAMOUS gene. Find the intron
            boundaries (GT...AG pairs) and splice them out.
          </p>
        </div>
      </div>

      {/* Pre-mRNA display */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <h3 className="text-sm font-bold text-stone-700 mb-2">
          {spliced ? 'Mature mRNA (introns removed, exons joined)' : 'Pre-mRNA — Click GT and AG splice sites to mark intron boundaries'}
        </h3>
        {!spliced ? (
          <>
            {renderSequence(premrna, true)}
            <div className="flex gap-3 mt-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-indigo-100 border border-indigo-300" />
                <span className="text-stone-500">Exon</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-stone-200 border border-stone-300" />
                <span className="text-stone-500">Intron</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-orange-100 border border-orange-300" />
                <span className="text-stone-500">Splice site (GT/AG)</span>
              </div>
            </div>
            {canSplice && (
              <button
                type="button"
                onClick={handleSplice}
                className="mt-3 px-6 py-2 bg-indigo-700 text-white rounded-lg text-sm font-bold hover:bg-indigo-800 transition-colors"
              >
                Splice! Remove introns
              </button>
            )}
          </>
        ) : (
          <>
            <div className="font-mono text-xs leading-relaxed">
              {matureMrna.split('').map((base, i) => (
                <span key={i} className="inline-block w-4 text-center py-0.5 bg-indigo-100 text-indigo-800">
                  {base}
                </span>
              ))}
            </div>
            <p className="text-sm text-stone-500 mt-2">
              The two introns have been removed and the three exons are now joined into a continuous
              coding sequence of {matureMrna.length} nucleotides.
            </p>
          </>
        )}
      </div>

      {/* Question */}
      {spliced && (
        <QuestionPanel
          question="If a mutation changed the GT at an intron boundary to GA, what would happen?"
          correct={submitted ? answer === 'a' : null}
          feedback={submitted ? (
            answer === 'a'
              ? 'Correct! The spliceosome would fail to recognize the 5\' splice site. The intron would be retained in the mRNA, likely introducing a premature stop codon or frameshift that disrupts the protein.'
              : 'Not quite. The GT dinucleotide is essential for spliceosome recognition. Without it, the intron cannot be removed.'
          ) : undefined}
        >
          <div className="space-y-2">
            {[
              { id: 'a', text: 'The intron would not be spliced out, and the mRNA would contain intronic sequence' },
              { id: 'b', text: 'Nothing — the spliceosome does not use GT signals' },
              { id: 'c', text: 'The exon would be removed instead' },
              { id: 'd', text: 'The protein would be identical' },
            ].map(opt => (
              <OptionButton
                key={opt.id}
                label={`(${opt.id}) ${opt.text}`}
                selected={answer === opt.id}
                correct={submitted ? (opt.id === 'a' ? answer === 'a' : answer === opt.id ? false : null) : null}
                onClick={() => { if (!submitted) setAnswer(opt.id); }}
                disabled={submitted}
              />
            ))}
          </div>
          {answer && !submitted && (
            <button
              type="button"
              onClick={() => setSubmitted(true)}
              className="mt-3 px-6 py-2 bg-indigo-700 text-white rounded-lg text-sm font-bold hover:bg-indigo-800 transition-colors"
            >
              Submit
            </button>
          )}
        </QuestionPanel>
      )}
    </div>
  );
}

// ── Experiment 2: The Full Processing Pipeline ──────────────────────────

function Exp2_ProcessingPipeline({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (submitted && answer === 'c' && !completedRef.current) {
      completedRef.current = true;
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [submitted, answer, onComplete]);

  const steps = [
    {
      title: 'Step 1: Transcription',
      description: 'RNA Polymerase II reads the template strand and synthesizes a pre-mRNA copy of the gene, including both exons and introns.',
      visual: 'pre-mRNA',
      label: 'Pre-mRNA (complete transcript)',
    },
    {
      title: "Step 2: 5' Capping",
      description: "A modified guanine nucleotide (7-methylguanosine cap) is added to the 5' end of the pre-mRNA. This protects the mRNA from degradation and is required for ribosome binding during translation.",
      visual: 'capped',
      label: "5' cap added (m7G-ppp)",
    },
    {
      title: 'Step 3: Splicing',
      description: 'The spliceosome removes introns and joins exons. In AGAMOUS, this joins the MADS domain (Exon 1), K domain (Exon 2), and C domain (Exon 3) into one continuous reading frame.',
      visual: 'spliced',
      label: 'Introns removed, exons joined',
    },
    {
      title: "Step 4: 3' Polyadenylation",
      description: "The pre-mRNA is cleaved downstream of the poly-A signal (AATAAA) and a tail of ~200 adenine nucleotides is added. The poly-A tail protects the mRNA from degradation and aids export from the nucleus.",
      visual: 'polya',
      label: "Poly-A tail added (AAAA...)",
    },
  ];

  const currentStep = steps[step];

  // Simplified visual representation of mRNA processing
  const renderProcessingVisual = (stage: string) => {
    const exonColor = '#6366f1';
    const intronColor = '#e5e7eb';
    const capColor = '#22c55e';
    const polyAColor = '#f97316';

    return (
      <svg viewBox="0 0 600 60" className="w-full">
        {/* Cap */}
        {(stage === 'capped' || stage === 'spliced' || stage === 'polya') && (
          <g>
            <circle cx={20} cy={30} r={10} fill={capColor} />
            <text x={20} y={34} fontSize={8} fill="white" textAnchor="middle" fontWeight="bold">m7G</text>
          </g>
        )}

        {/* mRNA body */}
        {(stage === 'pre-mRNA' || stage === 'capped') && (
          <g>
            <rect x={stage === 'capped' ? 35 : 20} y={20} width={100} height={20} rx={3} fill={exonColor} />
            <rect x={stage === 'capped' ? 135 : 120} y={20} width={80} height={20} rx={3} fill={intronColor} stroke="#d1d5db" strokeDasharray="4 2" />
            <rect x={stage === 'capped' ? 215 : 200} y={20} width={100} height={20} rx={3} fill={exonColor} />
            <rect x={stage === 'capped' ? 315 : 300} y={20} width={80} height={20} rx={3} fill={intronColor} stroke="#d1d5db" strokeDasharray="4 2" />
            <rect x={stage === 'capped' ? 395 : 380} y={20} width={100} height={20} rx={3} fill={exonColor} />
            {/* Labels */}
            <text x={stage === 'capped' ? 85 : 70} y={34} fontSize={9} fill="white" textAnchor="middle">Exon 1</text>
            <text x={stage === 'capped' ? 175 : 160} y={34} fontSize={8} fill="#9ca3af" textAnchor="middle">Intron 1</text>
            <text x={stage === 'capped' ? 265 : 250} y={34} fontSize={9} fill="white" textAnchor="middle">Exon 2</text>
            <text x={stage === 'capped' ? 355 : 340} y={34} fontSize={8} fill="#9ca3af" textAnchor="middle">Intron 2</text>
            <text x={stage === 'capped' ? 445 : 430} y={34} fontSize={9} fill="white" textAnchor="middle">Exon 3</text>
          </g>
        )}

        {(stage === 'spliced' || stage === 'polya') && (
          <g>
            <rect x={35} y={20} width={130} height={20} rx={3} fill={exonColor} />
            <rect x={165} y={20} width={130} height={20} rx={3} fill={exonColor} />
            <rect x={295} y={20} width={130} height={20} rx={3} fill={exonColor} />
            <text x={100} y={34} fontSize={9} fill="white" textAnchor="middle">Exon 1</text>
            <text x={230} y={34} fontSize={9} fill="white" textAnchor="middle">Exon 2</text>
            <text x={360} y={34} fontSize={9} fill="white" textAnchor="middle">Exon 3</text>
          </g>
        )}

        {/* Poly-A tail */}
        {stage === 'polya' && (
          <g>
            <rect x={425} y={20} width={80} height={20} rx={3} fill={polyAColor} opacity={0.7} />
            <text x={465} y={34} fontSize={9} fill="white" textAnchor="middle">AAAA...</text>
          </g>
        )}
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-5">
        <div className="text-sm text-stone-600 space-y-3">
          <p>
            Between transcription and translation, a eukaryotic mRNA undergoes three processing
            steps: <strong>5&apos; capping</strong>, <strong>splicing</strong>, and <strong>3&apos;
            polyadenylation</strong>. Each step is essential — without proper processing, the mRNA
            would be degraded or translated incorrectly.
          </p>
          <p>
            Walk through each step of processing for the AGAMOUS pre-mRNA.
          </p>
        </div>
      </div>

      {/* Processing steps */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <h3 className="text-sm font-bold text-stone-700 mb-1">{currentStep.title}</h3>
        <p className="text-sm text-stone-600 mb-4">{currentStep.description}</p>

        {renderProcessingVisual(currentStep.visual)}

        <p className="text-xs text-stone-400 mt-2 italic">{currentStep.label}</p>

        {/* Step navigation */}
        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold border border-stone-200 text-stone-600 disabled:opacity-30 hover:bg-stone-50 transition-colors"
          >
            Previous
          </button>
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === step ? 'bg-indigo-600' : i < step ? 'bg-indigo-300' : 'bg-stone-200'
              }`} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep(s => s + 1)}
            disabled={step === steps.length - 1}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-indigo-700 text-white disabled:opacity-30 hover:bg-indigo-800 transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      {/* Question — only after viewing all steps */}
      {step === steps.length - 1 && (
        <QuestionPanel
          question="A mutation deletes the poly-A signal (AATAAA) from the AGAMOUS gene. What is the most likely consequence?"
          correct={submitted ? answer === 'c' : null}
          feedback={submitted ? (
            answer === 'c'
              ? 'Correct! Without the poly-A signal, the mRNA would not be properly cleaved and polyadenylated. The poly-A tail is critical for mRNA stability and nuclear export. The mRNA would be rapidly degraded, resulting in little or no AGAMOUS protein.'
              : 'Not quite. The poly-A signal does not affect splicing or the coding sequence. It controls mRNA stability through polyadenylation.'
          ) : undefined}
        >
          <div className="space-y-2">
            {[
              { id: 'a', text: 'The introns would not be spliced out' },
              { id: 'b', text: 'The protein sequence would change' },
              { id: 'c', text: 'The mRNA would be unstable and rapidly degraded, reducing AGAMOUS expression' },
              { id: 'd', text: 'Nothing — the poly-A signal is not important' },
            ].map(opt => (
              <OptionButton
                key={opt.id}
                label={`(${opt.id}) ${opt.text}`}
                selected={answer === opt.id}
                correct={submitted ? (opt.id === 'c' ? answer === 'c' : answer === opt.id ? false : null) : null}
                onClick={() => { if (!submitted) setAnswer(opt.id); }}
                disabled={submitted}
              />
            ))}
          </div>
          {answer && !submitted && (
            <button
              type="button"
              onClick={() => setSubmitted(true)}
              className="mt-3 px-6 py-2 bg-indigo-700 text-white rounded-lg text-sm font-bold hover:bg-indigo-800 transition-colors"
            >
              Submit
            </button>
          )}
        </QuestionPanel>
      )}
    </div>
  );
}

// ── Experiment 3: Promoters ─────────────────────────────────────────────

function Exp3_Promoters({ onComplete }: { onComplete: () => void }) {
  const sequence = PROMOTER_EXERCISE_SEQUENCE;
  const tataStart = 20; // TATAAA starts at position 20
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const [found, setFound] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (submitted && answer === 'a' && !completedRef.current) {
      completedRef.current = true;
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [submitted, answer, onComplete]);

  const handleBaseClick = useCallback((pos: number) => {
    if (found) return;
    // Check if clicking within the TATA box region
    if (pos >= tataStart && pos < tataStart + 6) {
      setSelectedRange({ start: tataStart, end: tataStart + 6 });
      setFound(true);
    } else {
      setSelectedRange({ start: pos, end: pos + 1 });
    }
  }, [found]);

  return (
    <div className="space-y-6">
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-5">
        <div className="text-sm text-stone-600 space-y-3">
          <p>
            The <strong>promoter</strong> is the region of DNA immediately upstream of a gene where
            the transcription machinery assembles. The key element in many eukaryotic promoters is
            the <strong>TATA box</strong> — a short AT-rich sequence (consensus: TATAAA) located
            about 25-30 base pairs upstream of the transcription start site.
          </p>
          <p>
            The TATA box is recognized by <strong>TATA-binding protein (TBP)</strong>, which bends
            the DNA and helps position RNA Polymerase II at the correct start site. Without a
            functional TATA box, transcription initiation is severely impaired.
          </p>
          <p>
            Find the TATA box in the sequence below. Click on it to highlight it.
          </p>
        </div>
      </div>

      {/* Sequence display */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <h3 className="text-sm font-bold text-stone-700 mb-2">
          AGAMOUS Promoter Region — Find the TATA Box
        </h3>
        <div className="font-mono text-sm flex flex-wrap gap-0 leading-loose">
          {sequence.split('').map((base, i) => {
            const isTata = i >= tataStart && i < tataStart + 6;
            const isSelected = selectedRange && i >= selectedRange.start && i < selectedRange.end;
            let bg = '';
            if (found && isTata) {
              bg = 'bg-amber-300 text-amber-900 font-bold';
            } else if (isSelected && !found) {
              bg = 'bg-red-200 text-red-800';
            }
            return (
              <span
                key={i}
                onClick={() => handleBaseClick(i)}
                className={`inline-block w-5 text-center py-0.5 cursor-pointer hover:bg-indigo-100 transition-colors ${bg}`}
              >
                {base}
              </span>
            );
          })}
        </div>
        {found && (
          <div className="mt-3 bg-amber-50 rounded-lg border border-amber-200 p-3 text-sm text-amber-800">
            <strong>TATA box found!</strong> The sequence TATAAA at position {tataStart + 1} is
            where TBP binds to initiate assembly of the transcription machinery.
          </div>
        )}
        {selectedRange && !found && (
          <div className="mt-3 bg-red-50 rounded-lg border border-red-200 p-3 text-sm text-red-800">
            That is not the TATA box. Look for the consensus sequence TATAAA.
          </div>
        )}
      </div>

      {/* Question */}
      {found && (
        <QuestionPanel
          question="If you mutated the TATA box from TATAAA to GAGAAA, what would happen to gene expression?"
          correct={submitted ? answer === 'a' : null}
          feedback={submitted ? (
            answer === 'a'
              ? 'Correct! The TATA box is essential for positioning the transcription machinery. Mutating it would prevent TBP from binding, severely reducing or eliminating transcription of AGAMOUS. Crucially, the promoter does not encode any part of the protein — it controls when and where the gene is expressed. This is the fundamental difference between coding and regulatory sequences.'
              : 'Not quite. The TATA box is a regulatory element, not a coding region. It does not affect the protein sequence directly — it controls whether the gene is transcribed at all.'
          ) : undefined}
        >
          <div className="space-y-2">
            {[
              { id: 'a', text: 'Expression would be strongly reduced or eliminated' },
              { id: 'b', text: 'Expression would increase' },
              { id: 'c', text: 'The protein sequence would change' },
              { id: 'd', text: 'Nothing — the TATA box is in an intron' },
            ].map(opt => (
              <OptionButton
                key={opt.id}
                label={`(${opt.id}) ${opt.text}`}
                selected={answer === opt.id}
                correct={submitted ? (opt.id === 'a' ? answer === 'a' : answer === opt.id ? false : null) : null}
                onClick={() => { if (!submitted) setAnswer(opt.id); }}
                disabled={submitted}
              />
            ))}
          </div>
          {answer && !submitted && (
            <button
              type="button"
              onClick={() => setSubmitted(true)}
              className="mt-3 px-6 py-2 bg-indigo-700 text-white rounded-lg text-sm font-bold hover:bg-indigo-800 transition-colors"
            >
              Submit
            </button>
          )}
        </QuestionPanel>
      )}
    </div>
  );
}

// ── Experiment 4: Transcription Factors ─────────────────────────────────

function Exp4_TranscriptionFactors({ onComplete }: { onComplete: () => void }) {
  const sequence = CARG_EXERCISE_SEQUENCE;
  const cargBoxes = useMemo(() => findCArgBoxes(sequence), [sequence]);
  const [foundBoxes, setFoundBoxes] = useState<Set<number>>(new Set());
  const [clickFeedback, setClickFeedback] = useState<{ pos: number; correct: boolean } | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const completedRef = useRef(false);

  const allFound = foundBoxes.size === cargBoxes.length && cargBoxes.length > 0;

  useEffect(() => {
    if (submitted && answer === 'a' && !completedRef.current) {
      completedRef.current = true;
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [submitted, answer, onComplete]);

  const handleBaseClick = useCallback((pos: number) => {
    if (allFound) return;
    // Check if this position is within any CArG box
    const box = cargBoxes.find(b => pos >= b.position && pos < b.position + b.sequence.length);
    if (box) {
      setFoundBoxes(prev => new Set(prev).add(box.position));
      setClickFeedback({ pos: box.position, correct: true });
    } else {
      setClickFeedback({ pos, correct: false });
    }
  }, [allFound, cargBoxes]);

  return (
    <div className="space-y-6">
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-5">
        <p className="font-['Patrick_Hand'] text-lg text-stone-600 mb-3">CALTECH & UC SAN DIEGO, 1990</p>
        <div className="text-sm text-stone-600 space-y-3">
          <p>
            In 1990, Marty Yanofsky and colleagues cloned a remarkable gene from <em>Arabidopsis
            thaliana</em> called <strong>AGAMOUS</strong> (AG). When this gene is mutated, flowers
            undergo a dramatic homeotic transformation: <strong>stamens become petals</strong> and
            <strong> carpels become sepals</strong>. The flower loses its reproductive organs entirely.
          </p>
          <p>
            AGAMOUS encodes a <strong>MADS-box transcription factor</strong> — a protein whose 3D
            structure allows it to recognize and bind specific short DNA sequences called <strong>CArG
            boxes</strong>. The CArG box consensus is: <span className="font-mono bg-stone-100 px-1 rounded">
            CC[A/T]{'\u2086'}GG</span> — that is, CC followed by six A or T bases, followed by GG.
          </p>
          <p>
            Find the CArG boxes in the sequence below. There are {cargBoxes.length} of them.
          </p>
        </div>
      </div>

      {/* Sequence display */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <h3 className="text-sm font-bold text-stone-700 mb-2">
          DNA Sequence — Find the CArG Boxes ({foundBoxes.size}/{cargBoxes.length} found)
        </h3>
        <div className="font-mono text-sm flex flex-wrap gap-0 leading-loose">
          {sequence.split('').map((base, i) => {
            const inFoundBox = cargBoxes.some(b => foundBoxes.has(b.position) && i >= b.position && i < b.position + b.sequence.length);
            return (
              <span
                key={i}
                onClick={() => handleBaseClick(i)}
                className={`inline-block w-5 text-center py-0.5 cursor-pointer hover:bg-indigo-100 transition-colors ${
                  inFoundBox ? 'bg-orange-300 text-orange-900 font-bold' : 'text-stone-600'
                }`}
              >
                {base}
              </span>
            );
          })}
        </div>
        {clickFeedback && (
          <div className={`mt-3 rounded-lg border p-3 text-sm ${
            clickFeedback.correct
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {clickFeedback.correct
              ? `CArG box found! The motif ${cargBoxes.find(b => b.position === clickFeedback.pos)?.sequence ?? ''} matches the CC[A/T]\u2086GG consensus.`
              : 'Not a CArG box. Look for the pattern CC followed by six A or T bases, then GG.'}
          </div>
        )}
        {allFound && (
          <div className="mt-3 bg-indigo-50 rounded-lg border border-indigo-200 p-3 text-sm text-indigo-800">
            All {cargBoxes.length} CArG boxes identified! These are the DNA sequences that the
            AGAMOUS protein recognizes and binds to activate its target genes.
          </div>
        )}
      </div>

      {/* Question */}
      {allFound && (
        <QuestionPanel
          question="Why does AGAMOUS bind to CArG boxes but not to random DNA sequences?"
          correct={submitted ? answer === 'a' : null}
          feedback={submitted ? (
            answer === 'a'
              ? 'Correct! The MADS domain of AGAMOUS has a precise 3D structure that fits the shape of the CArG box DNA in the minor groove. This is molecular recognition — the same principle that governs enzyme-substrate binding, antibody-antigen interactions, and all of molecular biology. The protein surface and the DNA surface are complementary in shape and charge.'
              : 'Not quite. CArG boxes are found in promoter and regulatory regions, not in exons. AGAMOUS does not chemically modify the DNA. The key principle is shape complementarity between the protein and DNA surfaces.'
          ) : undefined}
        >
          <div className="space-y-2">
            {[
              { id: 'a', text: 'The 3D shape of the MADS domain has a surface that fits the shape of the CArG box DNA — molecular recognition' },
              { id: 'b', text: 'CArG boxes are always in exons' },
              { id: 'c', text: 'AGAMOUS chemically modifies the CArG box' },
              { id: 'd', text: 'CArG boxes produce a special RNA' },
            ].map(opt => (
              <OptionButton
                key={opt.id}
                label={`(${opt.id}) ${opt.text}`}
                selected={answer === opt.id}
                correct={submitted ? (opt.id === 'a' ? answer === 'a' : answer === opt.id ? false : null) : null}
                onClick={() => { if (!submitted) setAnswer(opt.id); }}
                disabled={submitted}
              />
            ))}
          </div>
          {answer && !submitted && (
            <button
              type="button"
              onClick={() => setSubmitted(true)}
              className="mt-3 px-6 py-2 bg-indigo-700 text-white rounded-lg text-sm font-bold hover:bg-indigo-800 transition-colors"
            >
              Submit
            </button>
          )}
        </QuestionPanel>
      )}
    </div>
  );
}

// ── Experiment 5: The ABC Model of Flower Development ───────────────────

function FlowerDiagram({ organs, labels }: {
  organs: [FlowerOrgan, FlowerOrgan, FlowerOrgan, FlowerOrgan];
  labels?: boolean;
}) {
  // Render a simplified top-down flower with 4 concentric whorls
  const whorls = [
    { organ: organs[3], r: 18, label: 'Whorl 4' },  // innermost = carpel
    { organ: organs[2], r: 32, label: 'Whorl 3' },
    { organ: organs[1], r: 46, label: 'Whorl 2' },
    { organ: organs[0], r: 60, label: 'Whorl 1' },  // outermost = sepal
  ];
  const cx = 70;
  const cy = 70;

  return (
    <svg viewBox="0 0 140 140" className="w-36 h-36">
      {whorls.map((w, i) => (
        <g key={i}>
          <circle
            cx={cx} cy={cy} r={w.r}
            fill={ORGAN_COLORS[w.organ]}
            stroke="white" strokeWidth={2}
            opacity={0.8}
          />
          {labels && (
            <text
              x={cx} y={cy - w.r + 12}
              fontSize={7} fill="white" textAnchor="middle" fontWeight="bold"
            >
              {ORGAN_LABELS[w.organ]}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function Exp5_ABCModel({ onComplete }: { onComplete: () => void }) {
  const [abc, setAbc] = useState<AbcState>({ A: true, B: true, C: true });
  const [answer, setAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const completedRef = useRef(false);

  const organs = useMemo(() => flowerPhenotype(abc), [abc]);
  const wtOrgans = useMemo(() => flowerPhenotype({ A: true, B: true, C: true }), []);

  useEffect(() => {
    if (submitted && answer === 'a' && !completedRef.current) {
      completedRef.current = true;
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [submitted, answer, onComplete]);

  const toggleGene = (gene: 'A' | 'B' | 'C') => {
    setAbc(prev => ({ ...prev, [gene]: !prev[gene] }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-5">
        <div className="text-sm text-stone-600 space-y-3">
          <p>
            In 1991, Enrico Coen and Elliot Meyerowitz proposed the <strong>ABC model</strong> of
            flower development — one of the most elegant models in plant biology. Three classes of
            homeotic genes control the identity of the four flower organ whorls:
          </p>
          <div className="grid grid-cols-2 gap-2 my-3">
            <div className="bg-white rounded-lg p-2 border border-stone-200">
              <div className="text-xs font-bold text-stone-700">A genes alone (whorl 1)</div>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ORGAN_COLORS.sepal }} />
                <span className="text-xs text-stone-600">Sepals</span>
              </div>
            </div>
            <div className="bg-white rounded-lg p-2 border border-stone-200">
              <div className="text-xs font-bold text-stone-700">A + B genes (whorl 2)</div>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ORGAN_COLORS.petal }} />
                <span className="text-xs text-stone-600">Petals</span>
              </div>
            </div>
            <div className="bg-white rounded-lg p-2 border border-stone-200">
              <div className="text-xs font-bold text-stone-700">B + C genes (whorl 3)</div>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ORGAN_COLORS.stamen }} />
                <span className="text-xs text-stone-600">Stamens</span>
              </div>
            </div>
            <div className="bg-white rounded-lg p-2 border border-stone-200">
              <div className="text-xs font-bold text-stone-700">C genes alone (whorl 4)</div>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ORGAN_COLORS.carpel }} />
                <span className="text-xs text-stone-600">Carpels</span>
              </div>
            </div>
          </div>
          <p>
            A key rule: <strong>A and C are mutually antagonistic</strong>. When C is lost, A expands
            into whorls 3 and 4. When A is lost, C expands into whorls 1 and 2.
          </p>
          <p>
            AGAMOUS is the C-function gene. Toggle genes on and off below to predict what happens.
          </p>
        </div>
      </div>

      {/* Interactive ABC toggle */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <h3 className="text-sm font-bold text-stone-700 mb-4">ABC Gene Activity</h3>

        <div className="flex items-start gap-6 flex-wrap">
          {/* Gene toggles */}
          <div className="space-y-3">
            {(['A', 'B', 'C'] as const).map(gene => (
              <button
                key={gene}
                type="button"
                onClick={() => toggleGene(gene)}
                className={`flex items-center gap-3 rounded-lg border-2 px-4 py-2 text-sm font-bold transition-all w-48 ${
                  abc[gene]
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
                    : 'border-red-300 bg-red-50 text-red-800 line-through'
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${
                  abc[gene] ? 'bg-indigo-600' : 'bg-red-400'
                }`}>
                  {abc[gene] ? 'ON' : 'X'}
                </span>
                {gene === 'A' ? 'A (AP1)' : gene === 'B' ? 'B (AP3/PI)' : 'C (AGAMOUS)'}
              </button>
            ))}
          </div>

          {/* Flower diagrams */}
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-xs font-bold text-stone-500 mb-1">Wild Type</p>
              <FlowerDiagram organs={wtOrgans} labels />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-stone-500 mb-1">Current Genotype</p>
              <FlowerDiagram organs={organs} labels />
            </div>
          </div>
        </div>

        {/* Whorl table */}
        <div className="mt-4 overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="py-1.5 px-2 text-left text-stone-500">Whorl</th>
                <th className="py-1.5 px-2 text-left text-stone-500">Active Genes</th>
                <th className="py-1.5 px-2 text-left text-stone-500">Organ</th>
              </tr>
            </thead>
            <tbody>
              {organs.map((organ, i) => {
                const genes: string[] = [];
                // Show which genes are active in this whorl based on ABC logic
                // (simplified: A in whorls 1-2, B in 2-3, C in 3-4 — modulated by antagonism)
                if (abc.A && (i <= 1 || !abc.C)) genes.push('A');
                if (abc.B && (i === 1 || i === 2)) genes.push('B');
                if (abc.C && (i >= 2 || !abc.A)) genes.push('C');
                return (
                  <tr key={i} className="border-b border-stone-100">
                    <td className="py-1.5 px-2 font-semibold text-stone-700">Whorl {i + 1}</td>
                    <td className="py-1.5 px-2 text-stone-600">{genes.join(' + ') || 'none'}</td>
                    <td className="py-1.5 px-2">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ORGAN_COLORS[organ] }} />
                        <span className="text-stone-700 font-semibold">{ORGAN_LABELS[organ]}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Question — predict the ag mutant */}
      <QuestionPanel
        question="If you knock out AGAMOUS (lose C function), what happens to the third whorl (normally stamens)?"
        correct={submitted ? answer === 'a' : null}
        feedback={submitted ? (
          answer === 'a'
            ? 'Correct! With C function lost, A function expands into whorls 3 and 4 (mutual antagonism). Whorl 3 now has A + B instead of B + C, so stamens become petals. Whorl 4 has A alone instead of C alone, so carpels become sepals. This is exactly what Yanofsky et al. observed in the ag mutant — a flower with sepals, petals, petals, sepals (and the pattern repeats indefinitely because the floral meristem is never terminated).'
            : 'Try toggling C off in the interactive above to see what happens. Remember: A and C are mutually antagonistic — when C is lost, A expands inward.'
        ) : undefined}
      >
        <div className="space-y-2">
          {[
            { id: 'a', text: 'Stamens become petals (now has A + B instead of B + C)' },
            { id: 'b', text: 'Stamens become sepals' },
            { id: 'c', text: 'Stamens disappear entirely' },
            { id: 'd', text: 'No change — other genes compensate' },
          ].map(opt => (
            <OptionButton
              key={opt.id}
              label={`(${opt.id}) ${opt.text}`}
              selected={answer === opt.id}
              correct={submitted ? (opt.id === 'a' ? answer === 'a' : answer === opt.id ? false : null) : null}
              onClick={() => { if (!submitted) setAnswer(opt.id); }}
              disabled={submitted}
            />
          ))}
        </div>
        {answer && !submitted && (
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            className="mt-3 px-6 py-2 bg-indigo-700 text-white rounded-lg text-sm font-bold hover:bg-indigo-800 transition-colors"
          >
            Submit
          </button>
        )}
      </QuestionPanel>
    </div>
  );
}

// ── Experiment 6: Protein Structure Determines DNA Binding ──────────────

function Exp6_ProteinStructure({ onComplete }: { onComplete: () => void }) {
  const [selectedResidue, setSelectedResidue] = useState<number | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const completedRef = useRef(false);

  // DNA-contacting residues in the MADS domain (approximate positions based on
  // Pellegrini et al. 1995 crystal structure of SRF/MCM1 MADS domains)
  const dnaContactResidues = new Set([2, 3, 4, 6, 7, 14, 15, 16, 17, 24, 25]);

  useEffect(() => {
    if (submitted && answer === 'a' && !completedRef.current) {
      completedRef.current = true;
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [submitted, answer, onComplete]);

  // Clean the MADS domain sequence (remove spaces)
  const cleanSeq = MADS_DOMAIN_SEQUENCE.replace(/\s+/g, '');

  return (
    <div className="space-y-6">
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-5">
        <div className="text-sm text-stone-600 space-y-3">
          <p>
            The <strong>MADS domain</strong> is the DNA-binding region of AGAMOUS — approximately
            60 amino acids that fold into a specific 3D structure. This structure contacts the DNA
            in the minor groove of the CArG box, making specific hydrogen bonds and van der Waals
            contacts with the bases.
          </p>
          <p>
            Not all amino acids in the MADS domain contact DNA equally. A few key residues make
            direct contacts. Mutating these residues destroys DNA binding while leaving the rest
            of the protein intact.
          </p>
          <p>
            Below is the MADS domain amino acid sequence of AGAMOUS. <strong>DNA-contacting residues</strong> are
            highlighted. Click on any residue to see its role.
          </p>
        </div>
      </div>

      {/* MADS domain display */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <h3 className="text-sm font-bold text-stone-700 mb-2">AGAMOUS MADS Domain</h3>
        <div className="font-mono text-sm flex flex-wrap gap-0 leading-loose">
          {cleanSeq.split('').map((aa, i) => {
            const isContact = dnaContactResidues.has(i);
            const isSelected = selectedResidue === i;
            return (
              <span
                key={i}
                onClick={() => setSelectedResidue(i)}
                className={`inline-block w-6 text-center py-0.5 cursor-pointer transition-colors rounded-sm ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-bold ring-2 ring-indigo-400'
                    : isContact
                      ? 'bg-orange-200 text-orange-900 font-bold hover:bg-orange-300'
                      : 'text-stone-500 hover:bg-stone-100'
                }`}
                title={`Position ${i + 1}: ${aa}`}
              >
                {aa}
              </span>
            );
          })}
        </div>
        <div className="flex gap-3 mt-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-orange-200 border border-orange-300" />
            <span className="text-stone-500">DNA-contacting residue</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-stone-100 border border-stone-200" />
            <span className="text-stone-500">Structural / other</span>
          </div>
        </div>

        {selectedResidue !== null && (
          <div className="mt-3 bg-indigo-50 rounded-lg border border-indigo-200 p-3 text-sm text-indigo-800">
            <strong>Position {selectedResidue + 1}: {cleanSeq[selectedResidue]}</strong>
            {dnaContactResidues.has(selectedResidue) ? (
              <span> — This residue makes direct contact with the CArG box DNA in the minor groove.
              Mutating it (e.g., to alanine) would disrupt DNA binding.</span>
            ) : (
              <span> — This residue is part of the protein&apos;s structural core or makes contacts
              with other protein subunits, not directly with the DNA.</span>
            )}
          </div>
        )}
      </div>

      {/* AlphaFold connection */}
      <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4">
        <h3 className="text-sm font-bold text-indigo-800 mb-2">Connecting to modern structural biology</h3>
        <p className="text-sm text-indigo-700">
          In 2020, DeepMind&apos;s <strong>AlphaFold</strong> solved the protein structure prediction
          problem — predicting 3D protein structure from amino acid sequence with near-experimental
          accuracy. <strong>AlphaFold 3</strong> (2024) can predict protein-DNA complexes. You could
          submit the MADS domain sequence plus a CArG box DNA sequence to the AlphaFold Server and
          see the predicted binding interface — the same interface that determines which genes AG
          activates in every <em>Arabidopsis</em> flower.
        </p>
      </div>

      {/* Question */}
      <QuestionPanel
        question="If you changed one of the DNA-contacting residues (e.g., arginine at position 3 to alanine), what would happen?"
        correct={submitted ? answer === 'a' : null}
        feedback={submitted ? (
          answer === 'a'
            ? 'Correct! The DNA-contacting residues are precisely positioned to recognize the CArG box. Changing even one key residue (like an arginine that makes hydrogen bonds to DNA bases) would disrupt the binding interface. Without DNA binding, AGAMOUS cannot activate its target genes, and those genes would not be expressed — leading to the same phenotype as a loss-of-function mutation.'
            : 'Not quite. The specific residues that contact DNA are critical for binding specificity. A single amino acid change at a contact point can abolish binding entirely.'
        ) : undefined}
      >
        <div className="space-y-2">
          {[
            { id: 'a', text: 'The MADS domain would no longer bind the CArG box, and AG target genes would not be expressed' },
            { id: 'b', text: 'The MADS domain would bind more strongly' },
            { id: 'c', text: 'The protein would fold differently but still bind DNA normally' },
            { id: 'd', text: 'Nothing — individual residues do not matter' },
          ].map(opt => (
            <OptionButton
              key={opt.id}
              label={`(${opt.id}) ${opt.text}`}
              selected={answer === opt.id}
              correct={submitted ? (opt.id === 'a' ? answer === 'a' : answer === opt.id ? false : null) : null}
              onClick={() => { if (!submitted) setAnswer(opt.id); }}
              disabled={submitted}
            />
          ))}
        </div>
        {answer && !submitted && (
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            className="mt-3 px-6 py-2 bg-indigo-700 text-white rounded-lg text-sm font-bold hover:bg-indigo-800 transition-colors"
          >
            Submit
          </button>
        )}
      </QuestionPanel>
    </div>
  );
}

// ── Experiment 7: From Sequence to Phenotype ────────────────────────────

function Exp7_Synthesis({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (submitted && answer === 'b' && !completedRef.current) {
      completedRef.current = true;
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [submitted, answer, onComplete]);

  const pipelineSteps = [
    {
      title: 'DNA',
      icon: 'dna',
      description: 'The AGAMOUS gene contains a nonsense mutation in Exon 2: a C-to-T change converts a glutamine codon (CAG) to a premature stop codon (TAG).',
      detail: 'Exon 1 (MADS domain) + Exon 2 with premature stop + Exon 3 (never reached)',
    },
    {
      title: 'Transcription',
      icon: 'rna',
      description: 'RNA Polymerase II transcribes the entire gene normally — the mutation does not affect transcription since it is in the coding region, not the promoter.',
      detail: 'Pre-mRNA is made, capped, spliced, and polyadenylated normally.',
    },
    {
      title: 'Translation',
      icon: 'ribosome',
      description: 'The ribosome translates the mRNA but encounters the premature stop codon in Exon 2. Translation terminates early.',
      detail: 'Result: a truncated protein containing only the MADS domain and part of the K domain.',
    },
    {
      title: 'Protein Folding',
      icon: 'protein',
      description: 'The truncated protein may fold its MADS domain correctly, but it is missing the C-terminal domain needed for full transcriptional activation and protein-protein interactions.',
      detail: 'The MADS domain alone may still bind DNA weakly, but cannot activate target genes effectively.',
    },
    {
      title: 'Gene Regulation',
      icon: 'regulation',
      description: 'Without functional AGAMOUS protein, the C-function target genes are not activated. B + C activation in whorl 3 fails; C-only activation in whorl 4 fails.',
      detail: 'Loss of C function triggers A-gene expansion (mutual antagonism).',
    },
    {
      title: 'Phenotype',
      icon: 'flower',
      description: 'The flower undergoes homeotic transformation: stamens become petals (A + B replaces B + C), carpels become sepals (A replaces C). The ag mutant phenotype.',
      detail: 'Sepal, Petal, Petal, Sepal — and the pattern repeats because the floral meristem is never terminated.',
    },
  ];

  const currentStep = pipelineSteps[step];
  const agMutantOrgans = useMemo(() => flowerPhenotype({ A: true, B: true, C: false }), []);

  return (
    <div className="space-y-6">
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-5">
        <p className="font-['Patrick_Hand'] text-lg text-stone-600 mb-3">THE FULL LOOP: DNA TO PHENOTYPE</p>
        <div className="text-sm text-stone-600 space-y-3">
          <p>
            Throughout this module, you have explored the different parts of a gene and how they
            contribute to protein function. Now let us trace a single mutation through the entire
            pipeline — from DNA sequence change to visible phenotype — to see how all the pieces
            connect.
          </p>
          <p>
            <strong>Scenario:</strong> A nonsense mutation in Exon 2 of AGAMOUS creates a premature
            stop codon. What happens at each step?
          </p>
        </div>
      </div>

      {/* Pipeline visualization */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        {/* Step indicators */}
        <div className="flex items-center gap-1 mb-4 overflow-x-auto">
          {pipelineSteps.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                i === step
                  ? 'bg-indigo-700 text-white'
                  : i < step
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-stone-100 text-stone-400'
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>

        {/* Current step content */}
        <div className="border-l-4 border-indigo-400 pl-4 py-2">
          <h3 className="text-sm font-bold text-stone-800 mb-1">{currentStep.title}</h3>
          <p className="text-sm text-stone-600 mb-2">{currentStep.description}</p>
          <p className="text-xs text-stone-400 italic">{currentStep.detail}</p>
        </div>

        {/* Show flower diagram on the phenotype step */}
        {step === pipelineSteps.length - 1 && (
          <div className="mt-4 flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs font-bold text-stone-500 mb-1">Wild Type</p>
              <FlowerDiagram organs={[
                'sepal', 'petal', 'stamen', 'carpel',
              ]} labels />
            </div>
            <div className="text-2xl text-stone-300">&rarr;</div>
            <div className="text-center">
              <p className="text-xs font-bold text-red-500 mb-1">ag Mutant</p>
              <FlowerDiagram organs={agMutantOrgans} labels />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold border border-stone-200 text-stone-600 disabled:opacity-30 hover:bg-stone-50 transition-colors"
          >
            Previous
          </button>
          <div className="flex gap-1.5">
            {pipelineSteps.map((_, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === step ? 'bg-indigo-600' : i < step ? 'bg-indigo-300' : 'bg-stone-200'
              }`} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep(s => s + 1)}
            disabled={step === pipelineSteps.length - 1}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-indigo-700 text-white disabled:opacity-30 hover:bg-indigo-800 transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      {/* Final question */}
      {step === pipelineSteps.length - 1 && (
        <QuestionPanel
          question="A different mutation destroys the CArG box in the promoter of a B-class gene (AP3), so AGAMOUS can no longer activate AP3 expression. In which whorls would you expect to see a change?"
          correct={submitted ? answer === 'b' : null}
          feedback={submitted ? (
            answer === 'b'
              ? 'Correct! AP3 is a B-class gene. B function is active in whorls 2 and 3. If AGAMOUS cannot activate AP3 through its CArG box, B function may be lost in whorl 3 (where AG and AP3 normally cooperate). Without B + C in whorl 3, the outcome depends on whether other activators of AP3 exist — but the direct prediction is that whorls 2 and 3 would be affected. This traces the full loop: a single base-pair change in a regulatory element alters transcription factor binding, which changes gene expression, which changes protein levels, which changes organ identity.'
              : 'Think about which whorls use B-function genes. AP3 is a B-class gene active in whorls 2 and 3. If its expression is disrupted by a CArG box mutation, those whorls would be affected.'
          ) : undefined}
        >
          <div className="space-y-2">
            {[
              { id: 'a', text: 'Only whorl 1 (sepals)' },
              { id: 'b', text: 'Whorls 2 and 3 (petals and stamens), where B-function genes act' },
              { id: 'c', text: 'Only whorl 4 (carpels)' },
              { id: 'd', text: 'All four whorls equally' },
            ].map(opt => (
              <OptionButton
                key={opt.id}
                label={`(${opt.id}) ${opt.text}`}
                selected={answer === opt.id}
                correct={submitted ? (opt.id === 'b' ? answer === 'b' : answer === opt.id ? false : null) : null}
                onClick={() => { if (!submitted) setAnswer(opt.id); }}
                disabled={submitted}
              />
            ))}
          </div>
          {answer && !submitted && (
            <button
              type="button"
              onClick={() => setSubmitted(true)}
              className="mt-3 px-6 py-2 bg-indigo-700 text-white rounded-lg text-sm font-bold hover:bg-indigo-800 transition-colors"
            >
              Submit
            </button>
          )}
        </QuestionPanel>
      )}
    </div>
  );
}

// ── Module definition ─────────────────────────────────────────────────

const EXPERIMENTS = [
  {
    id: 'genereg-0',
    title: 'Gene Anatomy',
    subtitle: 'The parts of a eukaryotic gene',
    Component: Exp0_GeneAnatomy,
  },
  {
    id: 'genereg-1',
    title: 'Splicing',
    subtitle: 'Exons, introns & the GT-AG rule',
    Component: Exp1_Splicing,
  },
  {
    id: 'genereg-2',
    title: 'mRNA Processing',
    subtitle: 'Cap, splice, poly-A',
    Component: Exp2_ProcessingPipeline,
  },
  {
    id: 'genereg-3',
    title: 'Promoters',
    subtitle: 'TATA box & transcription initiation',
    Component: Exp3_Promoters,
  },
  {
    id: 'genereg-4',
    title: 'Transcription Factors',
    subtitle: 'AGAMOUS & CArG boxes',
    Component: Exp4_TranscriptionFactors,
  },
  {
    id: 'genereg-5',
    title: 'ABC Model',
    subtitle: 'Flower organ identity',
    Component: Exp5_ABCModel,
  },
  {
    id: 'genereg-6',
    title: 'Protein-DNA Binding',
    subtitle: 'MADS domain structure',
    Component: Exp6_ProteinStructure,
  },
  {
    id: 'genereg-7',
    title: 'Synthesis',
    subtitle: 'From sequence to phenotype',
    Component: Exp7_Synthesis,
  },
];

const MODULE_DEF: ModuleDefinition = {
  id: 'genereg',
  title: 'Gene Structure & Regulation',
  subtitle: 'Gene anatomy, splicing, promoters, transcription factors & the ABC model',
  color: 'indigo',
  backLink: { href: '/breeding-game/modules.html', label: 'All Modules' },
  experiments: EXPERIMENTS,
};

export default function GeneRegModule() {
  return <ModuleShell module={MODULE_DEF} />;
}
