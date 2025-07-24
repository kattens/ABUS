### 🧬 ABUS: Adaptability, Bioinformatics, and Usability Score

**ABUS** is a structured scoring and recommendation framework designed to evaluate **Protein Language Models (PLMs)** based on their:

* **Adaptability** to new tasks or data
* **Bioinformatics relevance** for biological applications
* **Usability** for researchers and developers

The ABUS framework provides a fair, interpretable, and feature-driven scoring system to rank and recommend LLMs, especially PLMs, for bioinformatics use cases. It supports custom scoring profiles, visualization, and comparison tools to streamline PLM selection for your research.

![material](https://github.com/user-attachments/assets/1a1b83b6-beae-45e9-b5dd-856d8a0d33e1)


## 🎯 Objective

The **Adaptability Bioinformatics Usability Score (ABUS)** is a structured framework for evaluating and recommending Protein Language Models (pLMs) with multimodal capabilities. It enables researchers to:

* Quantify model utility across relevant bioinformatics categories
* Query models based on fine-grained feature-level constraints
* Receive personalized model recommendations for biological tasks

---
![abus pipeline](https://github.com/user-attachments/assets/53daf0e5-24b2-469f-bdf0-5112e5f9d4f5)


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


🧬 Full Feature Taxonomy

Below is the complete list of features scored under each ABUS category. These features form the foundation of both the scoring system and the recommender engine.
🔬 Bioinformatics Relevance Features

These capture the biological and multimodal relevance of a model.

    sequence_input: Boolean/Integer

    structure_input: Boolean/Integer

    evolutionary_input: Boolean/Integer

    functional_annotation_input: Boolean/Integer

    natural_language_input: Boolean/Integer

    omics_data_input: Boolean/Integer

    structure_prediction: Boolean/Integer

    function_prediction: Boolean/Integer

    interaction_prediction: Boolean/Integer

    sequence_generation: Boolean/Integer

    multimodal_image_protein: Boolean/Integer

    multimodal_text_protein: Boolean/Integer

    sequence_structure_integration: Boolean/Integer

    sequence_text_integration: Boolean/Integer

    sequence_evolution_integration: Boolean/Integer

    graph_multimodal: Boolean/Integer

    rag_integration: Boolean/Integer

    tool_usage: Boolean/Integer

    agentic_planning: Boolean/Integer

🛠️ Adaptability Features

These evaluate how easily a model can be extended, reused, or fine-tuned.

    peft_support: Boolean/Integer

    fine_tuning_scripts: Boolean/Integer

    model_modularity: Boolean/Integer

    pre_trained_checkpoints: Boolean/Integer

    open_source_license: Boolean/Integer

    generalization_capability: Boolean/Integer

🧑‍💻 Usability Features

These reflect how easy the model is to use for real researchers and developers.

    documentation_quality: Integer (Score)

    code_availability: Boolean/Integer

    community_support: Integer (Score)

    installation_complexity: Integer (Score)

    api_library_integration: Boolean/Integer

    pre_trained_model_availability: Boolean/Integer

⚡ Computational Efficiency Features

These describe the hardware demands and scalability of the model.

    model_size_params: Integer

    storage_memory_requirements: Text (Score/Description)

    fine_tuning_compute_cost: Text (Score/Description)

    inference_compute_cost: Text (Score/Description)

    hardware_compatibility: Text (Score/Description)

    energy_consumption: Text (Score/Description)

📤 Output Suitability Features

These ensure the model’s outputs are useful, interpretable, and fit the task.

    prediction_type_alignment: Boolean/Integer

    benchmark_performance: Text (Score/Description)

    interpretability: Integer (Score)

    output_granularity: Integer (Score)

    output_format_compatibility: Boolean/Integer

    uncertainty_quantification: Boolean/Integer

⚖️ Ethical Considerations

These capture issues around fairness, transparency, and privacy.

    bias_fairness: Text (Score/Description)

    data_privacy: Text (Score/Description)

    transparency_accountability: Text (Score/Description)

🔢 Scoring Formula
ABUSScore=Σ(categoryweight×(avgsubfeaturescore/2))NormalizedABUS=(ABUSScore/100)×100
ABUSScore=Σ(categoryw​eight×(avgsubfeaturescore/2))NormalizedABUS=(ABUSScore/100)×100

This results in a normalized 0–100 score per model.





---

## 📎 Citation & Acknowledgments

If you use ABUS in your research, please cite this repository and acknowledge:

> **Computational Bio Lab** & **Machine Psychology Lab**
> **Presenter**: Kattayun Ensafi
> **Professors**: Daniel Haehn, Nurit Haspel
