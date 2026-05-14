const { validateCitation, searchAcademicPapers } = require('../lib/academic-validator');

async function test() {
  console.log("🧪 Testing Academic Validator...");

  // Test DOI (Nature paper on COVID-19)
  const testDoi = "10.1038/s41586-020-2012-7";
  console.log(`\n1. Validating DOI: ${testDoi}`);
  const result = await validateCitation(testDoi);
  if (result.valid) {
    console.log("✅ Success!");
    console.log("APA:", result.apa);
  } else {
    console.error("❌ Failed:", result.error);
  }

  // Test Search
  const query = "impact of artificial intelligence in higher education";
  console.log(`\n2. Searching for: "${query}"`);
  const papers = await searchAcademicPapers(query, 3);
  if (papers.length > 0) {
    console.log(`✅ Found ${papers.length} papers.`);
    papers.forEach((p, i) => {
      console.log(`   [${i+1}] ${p.title} (${p.year})`);
    });
  } else {
    console.error("❌ No papers found.");
  }
}

test();
