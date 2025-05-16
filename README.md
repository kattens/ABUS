### 🧬 ABUS: Adaptability, Bioinformatics, and Usability Score

**ABUS** is a structured scoring and recommendation framework designed to evaluate **Protein Language Models (PLMs)** based on their:

* **Adaptability** to new tasks or data
* **Bioinformatics relevance** for biological applications
* **Usability** for researchers and developers

The ABUS framework provides a fair, interpretable, and feature-driven scoring system to rank and recommend PLMs for bioinformatics use cases. It supports custom scoring profiles, visualization, and comparison tools to streamline PLM selection for your research.

![material](https://github.com/user-attachments/assets/1a1b83b6-beae-45e9-b5dd-856d8a0d33e1)


## 🎯 Objective

The **Adaptability Bioinformatics Usability Score (ABUS)** is a structured framework for evaluating and recommending Protein Language Models (pLMs) with multimodal capabilities. It enables researchers to:

* Quantify model utility across relevant bioinformatics categories
* Query models based on fine-grained feature-level constraints
* Receive personalized model recommendations for biological tasks

---

## 🧪 Step 1: Build the ABUS Scoring Database

### 📊 Category Structure

Each model is scored across five weighted categories:

| Category                 | Example Subfeatures                                   | Default Weight (%) |
| ------------------------ | ----------------------------------------------------- | ------------------ |
| Adaptability             | `modular_architecture`, `transferability`             | 20                 |
| Bioinformatics Relevance | `biological_input_modalities`, `structural_awareness` | 30                 |
| Usability                | `code_availability`, `documentation_quality`          | 15                 |
| Computational Efficiency | `parameter_count_efficiency`, `runtime_scalability`   | 15                 |
| Output Suitability       | `output_interpretability`, `task_alignment`           | 20                 |

Each subfeature is scored on a **0–2** scale:

* `0 = No support`
* `1 = Partial support`
* `2 = Full support`

Scores include **justification notes** (e.g., from GitHub, papers, benchmarks).

### 🔢 Scoring Formula

```math
ABUSScore = Σ (category_weight × (avg subfeature score / 2))

Normalized ABUS = (ABUSScore / 100) × 100
```

This results in a normalized **0–100** score per model.

### 🧾 JSON Format Example

```json
{
  "ModelName": {
    "adaptability": {
      "weight": 20,
      "subfeatures": {
        "modular_architecture": {
          "score": 2,
          "note": "Uses plug-in adapters over transformer backbone"
        }
      }
    }
  }
}
```

### 🛠️ Implementation Notes

* Python script: `abus_scoring_engine.py`
* Data sources: Peer-reviewed papers, GitHub, model cards
* Extensible metadata: year, license, version history

---

## 🤖 Step 2: Feature-Aware Recommender System

This is a **content-based recommender system** that matches user-defined filters to the most relevant pLMs.

### ⚙️ How It Works

Users submit a feature query, such as:

```json
{
  "usability.code_availability": ">= 1.5",
  "bioinformatics_relevance.biological_input_modalities": "== 2"
}
```

The system:

* Filters models satisfying all constraints
* Ranks results by ABUS or custom scores

### 📐 Mathematical Framing

Given a query vector `q` and models with feature vectors `f_i`, return:

```math
Top-k { m_i ∈ M | f_i[j] satisfies q[j] }, ranked by ABUS score
```

### ✅ Benefits

* Explainable, feature-based filtering
* Scalable to top-k queries or similarity metrics
* Easy to integrate into UIs, APIs, or notebooks

---

## 🔭 Future Steps

### Step 3: Expand Model Coverage

* Add 20+ new pLMs, including multimodal & baselines
* Track new models from HuggingFace, DeepMind, etc.

### Step 4: Visualization

* Bar charts for category scores
* Radar plots for model profiles
* Heatmaps for subfeature matrices

### Step 5: Web Interface or Colab App

* Streamlit/Flask UI for filtering and visualization
* Colab widgets and exportable results

### Step 6: Real-World Validation

* Test top models on real PPI or structure prediction tasks
* Benchmark against non-recommended models

### Step 7: Custom Scoring Profiles

* Users can reweight categories (e.g., ABUS-PPI)
* Presets can be saved, shared, and compared

### Step 8: Maintenance & Updates

* Automate model tracking via GitHub API
* Enable community-sourced scores
* Version control for scoring history

---

## 📐 Scoring System Explained

Each pLM is scored using a normalized 0–100 formula based on:

* Subfeature scores: `0`, `1`, or `2`
* Equal or custom subfeature weights
* Fixed category weights (e.g., Usability = 15%)

### 🧮 Example: Scoring "Usability"

| Subfeature              | Score | Weight |
| ----------------------- | ----- | ------ |
| `code_availability`     | 2     | 1      |
| `documentation_quality` | 1     | 1      |
| `setup_ease`            | 1     | 1      |

1. Subfeature Average: `(2 + 1 + 1)/3 = 1.33`
2. Normalize: `1.33 / 2 = 0.665`
3. Apply weight: `0.665 × 15 = 9.975`

### Full Example Breakdown

| Category                 | Avg Score | Normalized | Weight | Weighted   |
| ------------------------ | --------- | ---------- | ------ | ---------- |
| Adaptability             | 1.5       | 0.75       | 20     | 15.0       |
| Bioinformatics Relevance | 2.0       | 1.00       | 30     | 30.0       |
| Usability                | 1.33      | 0.665      | 15     | 9.975      |
| Computational Efficiency | 1.0       | 0.50       | 15     | 7.5        |
| Output Suitability       | 1.5       | 0.75       | 20     | 15.0       |
| **Total ABUS Score**     |           |            | 100    | **77.475** |

---

## 📊 Scoring Methodology

### 🎓 Manual Scoring Process

Each subfeature is evaluated manually using:

| Score | Meaning                        |
| ----- | ------------------------------ |
| 0     | No support or not mentioned    |
| 1     | Partial support or unclear     |
| 2     | Fully supported and documented |

**Sources**:

* Peer-reviewed papers
* Official GitHub repositories
* Model cards/documentation
* Benchmarks and leaderboards

### 🧾 Example Justification

> "Supports sequence, structure, and evolutionary inputs."
> → `biological_input_modalities` = 2
> → `note`: "Efficient embeddings from sequence, structure, and evolution."

---

## 📘 Model Summaries

| Model           | Highlights                                            |
| --------------- | ----------------------------------------------------- |
| **MULAN**       | High adaptability & bio relevance; moderate usability |
| **ProCyon**     | Mixed support; strong output suitability              |
| **Evola**       | Multimodal; lacks usability & efficiency              |
| **PoET-2**      | Excellent across categories; small and powerful       |
| **DPLM-2**      | Strong on structure, good adaptability                |
| **ProteinChat** | Very interpretable outputs; moderate features         |
| **MetaDegron**  | Excellent across all categories                       |
| **FAPM**        | Great usability, no structure input                   |
| **ProtLLM**     | Sequence + text; moderate usability                   |
| **ProtST**      | Strong usability and good output suitability          |
| **HelixProtX**  | Best for modular input/output handling                |
| **Prot2Text**   | GNN-LLM fusion; interpretable and documented          |

---

## 📎 Citation & Acknowledgments

If you use ABUS in your research, please cite this repository and acknowledge:

> **Computational Bio Lab** & **Machine Psychology Lab**
> **Presenter**: Kattayun Ensafi
> **Professors**: Daniel Haehn, Nurit Haspel
