import {
  PrismaClient,
  QuestionType,
  Difficulty,
  PaperType,
} from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import bcrypt from "bcryptjs";

// Match lib/db.ts: use Accelerate for Prisma Postgres (`prisma+postgres://`) URLs.
const dbUrl = process.env.DATABASE_URL ?? "";
const useAccelerate =
  dbUrl.startsWith("prisma+postgres://") || dbUrl.startsWith("prisma://");
const baseClient = new PrismaClient();
const prisma = (
  useAccelerate ? baseClient.$extends(withAccelerate()) : baseClient
) as unknown as PrismaClient;

type SeedQuestion = {
  stem: string;
  subject: string; // subject slug
  topic?: string; // topic slug
  options: { key: string; text: string }[];
  correct: string[];
  solution: string;
  difficulty?: Difficulty;
};

async function main() {
  console.log("🌱 Seeding database…");

  // --- Users ---------------------------------------------------------------
  const adminPassword = await bcrypt.hash("Admin@12345", 10);
  const studentPassword = await bcrypt.hash("Student@123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@prep.test" },
    update: { role: "ADMIN", passwordHash: adminPassword },
    create: {
      email: "admin@prep.test",
      name: "Portal Admin",
      role: "ADMIN",
      passwordHash: adminPassword,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "student@prep.test" },
    update: { passwordHash: studentPassword },
    create: {
      email: "student@prep.test",
      name: "Asha Verma",
      role: "STUDENT",
      passwordHash: studentPassword,
    },
  });

  console.log(`   admin:   ${admin.email} / Admin@12345`);
  console.log(`   student: ${student.email} / Student@123`);

  // --- Exam: NEET UG -------------------------------------------------------
  const neet = await prisma.exam.upsert({
    where: { slug: "neet-ug" },
    update: {},
    create: {
      slug: "neet-ug",
      name: "NEET UG",
      description:
        "National Eligibility cum Entrance Test (Undergraduate) — Physics, Chemistry, Biology.",
    },
  });

  // Clear previously-seeded papers/questions for a clean, idempotent re-run.
  await prisma.paper.deleteMany({ where: { examId: neet.id } });
  await prisma.question.deleteMany({ where: { examId: neet.id } });

  const subjectDefs = [
    { slug: "physics", name: "Physics" },
    { slug: "chemistry", name: "Chemistry" },
    { slug: "biology", name: "Biology" },
  ];
  const subjects: Record<string, string> = {};
  for (const s of subjectDefs) {
    const subj = await prisma.subject.upsert({
      where: { examId_slug: { examId: neet.id, slug: s.slug } },
      update: { name: s.name },
      create: { examId: neet.id, slug: s.slug, name: s.name },
    });
    subjects[s.slug] = subj.id;
  }

  const topicDefs: { subject: string; slug: string; name: string }[] = [
    { subject: "physics", slug: "kinematics", name: "Kinematics" },
    { subject: "physics", slug: "current-electricity", name: "Current Electricity" },
    { subject: "chemistry", slug: "mole-concept", name: "Mole Concept" },
    { subject: "chemistry", slug: "chemical-bonding", name: "Chemical Bonding" },
    { subject: "biology", slug: "cell-biology", name: "Cell Biology" },
    { subject: "biology", slug: "human-physiology", name: "Human Physiology" },
  ];
  const topics: Record<string, string> = {};
  for (const t of topicDefs) {
    const topic = await prisma.topic.upsert({
      where: { subjectId_slug: { subjectId: subjects[t.subject], slug: t.slug } },
      update: { name: t.name },
      create: { subjectId: subjects[t.subject], slug: t.slug, name: t.name },
    });
    topics[t.slug] = topic.id;
  }

  const neetQuestions: SeedQuestion[] = [
    {
      stem: "A car accelerates uniformly from rest and covers 100 m in 5 s. Its acceleration is:",
      subject: "physics",
      topic: "kinematics",
      options: [
        { key: "A", text: "4 m/s²" },
        { key: "B", text: "8 m/s²" },
        { key: "C", text: "10 m/s²" },
        { key: "D", text: "20 m/s²" },
      ],
      correct: ["B"],
      solution:
        "Using s = ut + ½at² with u = 0: 100 = ½·a·(5)² = 12.5a ⇒ a = 8 m/s².",
      difficulty: "EASY",
    },
    {
      stem: "The equivalent resistance of two resistors 6 Ω and 3 Ω connected in parallel is:",
      subject: "physics",
      topic: "current-electricity",
      options: [
        { key: "A", text: "9 Ω" },
        { key: "B", text: "3 Ω" },
        { key: "C", text: "2 Ω" },
        { key: "D", text: "18 Ω" },
      ],
      correct: ["C"],
      solution:
        "1/R = 1/6 + 1/3 = 1/6 + 2/6 = 3/6 = 1/2 ⇒ R = 2 Ω.",
      difficulty: "EASY",
    },
    {
      stem: "A body is thrown vertically upward with velocity 20 m/s. The maximum height reached (g = 10 m/s²) is:",
      subject: "physics",
      topic: "kinematics",
      options: [
        { key: "A", text: "10 m" },
        { key: "B", text: "20 m" },
        { key: "C", text: "30 m" },
        { key: "D", text: "40 m" },
      ],
      correct: ["B"],
      solution: "H = u²/(2g) = 400/20 = 20 m.",
      difficulty: "MEDIUM",
    },
    {
      stem: "Kirchhoff's junction rule is a consequence of conservation of:",
      subject: "physics",
      topic: "current-electricity",
      options: [
        { key: "A", text: "Energy" },
        { key: "B", text: "Momentum" },
        { key: "C", text: "Charge" },
        { key: "D", text: "Mass" },
      ],
      correct: ["C"],
      solution:
        "The junction (current) rule states ΣI_in = ΣI_out, which follows from conservation of electric charge.",
      difficulty: "MEDIUM",
    },
    {
      stem: "The number of moles in 22 g of CO₂ (molar mass 44 g/mol) is:",
      subject: "chemistry",
      topic: "mole-concept",
      options: [
        { key: "A", text: "0.25" },
        { key: "B", text: "0.5" },
        { key: "C", text: "1.0" },
        { key: "D", text: "2.0" },
      ],
      correct: ["B"],
      solution: "moles = mass / molar mass = 22 / 44 = 0.5 mol.",
      difficulty: "EASY",
    },
    {
      stem: "Which of the following molecules is non-polar despite having polar bonds?",
      subject: "chemistry",
      topic: "chemical-bonding",
      options: [
        { key: "A", text: "H₂O" },
        { key: "B", text: "NH₃" },
        { key: "C", text: "CO₂" },
        { key: "D", text: "HCl" },
      ],
      correct: ["C"],
      solution:
        "CO₂ is linear and symmetric; the two C=O bond dipoles cancel, giving zero net dipole moment.",
      difficulty: "MEDIUM",
    },
    {
      stem: "The hybridisation of carbon in methane (CH₄) is:",
      subject: "chemistry",
      topic: "chemical-bonding",
      options: [
        { key: "A", text: "sp" },
        { key: "B", text: "sp²" },
        { key: "C", text: "sp³" },
        { key: "D", text: "sp³d" },
      ],
      correct: ["C"],
      solution:
        "Carbon forms four equivalent σ-bonds in a tetrahedral geometry ⇒ sp³ hybridisation.",
      difficulty: "EASY",
    },
    {
      stem: "Avogadro's number is approximately:",
      subject: "chemistry",
      topic: "mole-concept",
      options: [
        { key: "A", text: "6.022 × 10²³" },
        { key: "B", text: "6.022 × 10²²" },
        { key: "C", text: "3.011 × 10²³" },
        { key: "D", text: "1.6 × 10⁻¹⁹" },
      ],
      correct: ["A"],
      solution: "Avogadro's number Nₐ ≈ 6.022 × 10²³ entities per mole.",
      difficulty: "EASY",
    },
    {
      stem: "The powerhouse of the cell is the:",
      subject: "biology",
      topic: "cell-biology",
      options: [
        { key: "A", text: "Nucleus" },
        { key: "B", text: "Ribosome" },
        { key: "C", text: "Mitochondrion" },
        { key: "D", text: "Golgi apparatus" },
      ],
      correct: ["C"],
      solution:
        "Mitochondria generate most of the cell's ATP via oxidative phosphorylation — hence 'powerhouse of the cell'.",
      difficulty: "EASY",
    },
    {
      stem: "Which blood cells are primarily responsible for immune defence?",
      subject: "biology",
      topic: "human-physiology",
      options: [
        { key: "A", text: "Erythrocytes" },
        { key: "B", text: "Leucocytes" },
        { key: "C", text: "Thrombocytes" },
        { key: "D", text: "Plasma" },
      ],
      correct: ["B"],
      solution:
        "Leucocytes (white blood cells) mediate immune responses; erythrocytes carry O₂ and thrombocytes aid clotting.",
      difficulty: "EASY",
    },
    {
      stem: "The functional unit of the kidney is the:",
      subject: "biology",
      topic: "human-physiology",
      options: [
        { key: "A", text: "Neuron" },
        { key: "B", text: "Nephron" },
        { key: "C", text: "Alveolus" },
        { key: "D", text: "Villus" },
      ],
      correct: ["B"],
      solution:
        "The nephron is the structural and functional unit of the kidney where filtration and reabsorption occur.",
      difficulty: "EASY",
    },
    {
      stem: "During which phase of mitosis do chromosomes align at the metaphase plate?",
      subject: "biology",
      topic: "cell-biology",
      options: [
        { key: "A", text: "Prophase" },
        { key: "B", text: "Metaphase" },
        { key: "C", text: "Anaphase" },
        { key: "D", text: "Telophase" },
      ],
      correct: ["B"],
      solution:
        "By definition, in metaphase chromosomes line up along the equatorial (metaphase) plate.",
      difficulty: "MEDIUM",
    },
  ];

  const createdNeet = [];
  for (const q of neetQuestions) {
    const created = await prisma.question.create({
      data: {
        type: QuestionType.MCQ_SINGLE,
        stem: q.stem,
        options: q.options,
        answer: q.correct,
        solution: q.solution,
        marks: 4,
        negativeMarks: 1,
        difficulty: q.difficulty ?? "MEDIUM",
        year: 2023,
        shift: "Shift 1",
        examId: neet.id,
        subjectId: subjects[q.subject],
        topicId: q.topic ? topics[q.topic] : null,
      },
    });
    createdNeet.push({ id: created.id, subject: q.subject });
  }

  // NEET paper — order Physics, Chemistry, Biology
  const neetPaper = await prisma.paper.create({
    data: {
      title: "NEET UG 2023 — Sample Mock Test",
      description:
        "A short, timed sample paper covering Physics, Chemistry and Biology.",
      type: PaperType.PREVIOUS_YEAR,
      examId: neet.id,
      durationMins: 30,
      year: 2023,
      isPublished: true,
    },
  });

  const sectionBySubject: Record<string, string> = {
    physics: "Physics",
    chemistry: "Chemistry",
    biology: "Biology",
  };
  const ordered = [
    ...createdNeet.filter((q) => q.subject === "physics"),
    ...createdNeet.filter((q) => q.subject === "chemistry"),
    ...createdNeet.filter((q) => q.subject === "biology"),
  ];
  await prisma.paperQuestion.createMany({
    data: ordered.map((q, i) => ({
      paperId: neetPaper.id,
      questionId: q.id,
      order: i + 1,
      section: sectionBySubject[q.subject],
    })),
  });

  // --- Exam: JEE Mains -----------------------------------------------------
  const jee = await prisma.exam.upsert({
    where: { slug: "jee-mains" },
    update: {},
    create: {
      slug: "jee-mains",
      name: "JEE Mains",
      description:
        "Joint Entrance Examination (Main) — Physics, Chemistry, Mathematics.",
    },
  });
  await prisma.paper.deleteMany({ where: { examId: jee.id } });
  await prisma.question.deleteMany({ where: { examId: jee.id } });

  const jeeSubjects: Record<string, string> = {};
  for (const s of [
    { slug: "physics", name: "Physics" },
    { slug: "chemistry", name: "Chemistry" },
    { slug: "mathematics", name: "Mathematics" },
  ]) {
    const subj = await prisma.subject.upsert({
      where: { examId_slug: { examId: jee.id, slug: s.slug } },
      update: { name: s.name },
      create: { examId: jee.id, slug: s.slug, name: s.name },
    });
    jeeSubjects[s.slug] = subj.id;
  }

  const jeeQuestions: SeedQuestion[] = [
    {
      stem: "The value of ∫₀^(π/2) sin(x) dx is:",
      subject: "mathematics",
      options: [
        { key: "A", text: "0" },
        { key: "B", text: "1" },
        { key: "C", text: "π/2" },
        { key: "D", text: "2" },
      ],
      correct: ["B"],
      solution: "∫ sin x dx = −cos x. Evaluating 0→π/2: (−cos π/2)−(−cos 0) = 0+1 = 1.",
      difficulty: "MEDIUM",
    },
    {
      stem: "If the roots of x² − 5x + 6 = 0 are α and β, then α + β equals:",
      subject: "mathematics",
      options: [
        { key: "A", text: "5" },
        { key: "B", text: "6" },
        { key: "C", text: "−5" },
        { key: "D", text: "1" },
      ],
      correct: ["A"],
      solution: "For ax²+bx+c=0, sum of roots = −b/a = 5.",
      difficulty: "EASY",
    },
    {
      stem: "A projectile is launched at 45° with speed v. Its range on level ground (g) is:",
      subject: "physics",
      options: [
        { key: "A", text: "v²/g" },
        { key: "B", text: "v²/(2g)" },
        { key: "C", text: "2v²/g" },
        { key: "D", text: "v² sin(2θ)/g with θ=45°" },
      ],
      correct: ["A"],
      solution:
        "R = v² sin(2θ)/g. At θ=45°, sin(90°)=1 ⇒ R = v²/g. (Option D is the general form and also correct, but A is the simplified value.)",
      difficulty: "MEDIUM",
    },
    {
      stem: "The oxidation state of sulphur in H₂SO₄ is:",
      subject: "chemistry",
      options: [
        { key: "A", text: "+2" },
        { key: "B", text: "+4" },
        { key: "C", text: "+6" },
        { key: "D", text: "−2" },
      ],
      correct: ["C"],
      solution:
        "2(+1) + S + 4(−2) = 0 ⇒ 2 + S − 8 = 0 ⇒ S = +6.",
      difficulty: "MEDIUM",
    },
    {
      stem: "The SI unit of electric field is:",
      subject: "physics",
      options: [
        { key: "A", text: "N/C" },
        { key: "B", text: "C/N" },
        { key: "C", text: "J/C" },
        { key: "D", text: "V·m" },
      ],
      correct: ["A"],
      solution:
        "E = F/q, so units are newton per coulomb (N/C), equivalently volt per metre (V/m).",
      difficulty: "EASY",
    },
    {
      stem: "The derivative of ln(x) with respect to x is:",
      subject: "mathematics",
      options: [
        { key: "A", text: "x" },
        { key: "B", text: "1/x" },
        { key: "C", text: "ln(x)/x" },
        { key: "D", text: "e^x" },
      ],
      correct: ["B"],
      solution: "d/dx [ln x] = 1/x for x > 0.",
      difficulty: "EASY",
    },
  ];

  const createdJee = [];
  for (const q of jeeQuestions) {
    const created = await prisma.question.create({
      data: {
        type: QuestionType.MCQ_SINGLE,
        stem: q.stem,
        options: q.options,
        answer: q.correct,
        solution: q.solution,
        marks: 4,
        negativeMarks: 1,
        difficulty: q.difficulty ?? "MEDIUM",
        year: 2024,
        shift: "Shift 2",
        examId: jee.id,
        subjectId: jeeSubjects[q.subject],
      },
    });
    createdJee.push(created.id);
  }

  const jeePaper = await prisma.paper.create({
    data: {
      title: "JEE Mains 2024 — Sample Mock Test",
      description: "Physics, Chemistry & Mathematics quick mock.",
      type: PaperType.MOCK,
      examId: jee.id,
      durationMins: 20,
      year: 2024,
      isPublished: true,
    },
  });
  await prisma.paperQuestion.createMany({
    data: createdJee.map((id, i) => ({
      paperId: jeePaper.id,
      questionId: id,
      order: i + 1,
    })),
  });

  // --- Other exams (taxonomy only, for browsing) ---------------------------
  await prisma.exam.upsert({
    where: { slug: "cuet-ug" },
    update: {},
    create: {
      slug: "cuet-ug",
      name: "CUET UG",
      description: "Common University Entrance Test (Undergraduate).",
    },
  });
  await prisma.exam.upsert({
    where: { slug: "ctet" },
    update: {},
    create: {
      slug: "ctet",
      name: "CTET",
      description: "Central Teacher Eligibility Test.",
    },
  });

  console.log(
    `✅ Seeded ${neetQuestions.length + jeeQuestions.length} questions and 2 papers across 4 exams.`
  );
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
