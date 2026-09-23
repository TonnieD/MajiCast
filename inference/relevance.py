"""
MajiCast Water Quality Relevance Gate
=====================================
Pre-classification relevance filtering for text-based water quality reports.
Provides reference vocabularies (English, Kiswahili, Sheng) and token matching
logic to prevent classifying off-topic, empty, or uninformative observations.
"""

from __future__ import annotations

import re
from typing import List, Set, Tuple

# ── Configurable Threshold ──────────────────────────────────────────────────
# Minimum number of distinct water-quality keyword matches required for an
# input to be deemed relevant and passed to the classification model.
WATER_RELEVANCE_MIN_MATCHES: int = 2

# ── Reference Vocabulary ────────────────────────────────────────────────────
# Curated vocabulary of water-quality, sensory, source, and contaminant terms
# across English, Kiswahili, and Sheng.
# Note: Ambiguous terms like "manzi" (which colloquially means girl/woman in Sheng)
# have been intentionally omitted.

ENGLISH_TERMS: Set[str] = {
    # Water & sources
    "water", "borehole", "tap", "well", "river", "stream", "spring", "lake",
    "pond", "dam", "pipe", "pipeline", "tank", "reservoir", "drain", "drainage",
    "source", "supply", "catchment", "runoff", "groundwater", "aquifer",
    
    # Visual / Color / Clarity
    "color", "colour", "clarity", "clear", "cloudy", "murky", "turbid", "turbidity",
    "brown", "brownish", "green", "greenish", "black", "blackish", "yellow", "yellowish",
    "red", "reddish", "milky", "transparent", "opaque", "discolored", "discoloured",
    "sediment", "sediments", "particles", "suspended", "floating", "rust", "rusty",
    "scum", "foam", "froth", "algae", "silt", "mud", "muddy", "sand", "sandy",
    
    # Odor / Smell
    "odor", "odour", "smell", "smells", "smelling", "scent", "stink", "stinks",
    "stinking", "stench", "foul", "pungent", "chemical", "chlorine", "sulfur",
    "sulphur", "sewage", "rotten", "metallic", "earthy", "musty", "fishy",
    
    # Taste / Sensation
    "taste", "tastes", "tasting", "flavor", "flavour", "salty", "bitter", "sour",
    "sweet", "acidic", "alkaline", "metallic",
    
    # Quality / Health / Condition
    "clean", "pure", "fresh", "safe", "potable", "drinkable", "unsafe", "dirty",
    "contaminated", "contamination", "polluted", "pollution", "toxic", "poison",
    "poisonous", "germs", "bacteria", "waste", "effluent", "leak", "leaking",
    "broken", "stagnant", "debris", "disease", "cholera", "typhoid", "diarrhea",
    "diarrhoea", "sick", "illness"
}

KISWAHILI_TERMS: Set[str] = {
    # Water & sources
    "maji", "kisima", "bomba", "mto", "chemchemi", "ziwa", "bwawa", "mfereji",
    "tangi", "mrija", "chemchemi", "mto",
    
    # Visual / Color / Clarity
    "rangi", "usafi", "hudhurungi", "kijani", "nyeusi", "manjano", "nyekundu",
    "meupe", "machafu", "matope", "tope", "mchanga", "ukungu", "masizi",
    "mwani", "povu", "chafu", "kutu", "takataka",
    
    # Odor / Smell
    "harufu", "uvundo", "nuka", "kunuka", "inanuka", "harufu mbaya",
    "kemikali", "kinyesi", "mfereji",
    
    # Taste / Sensation
    "ladha", "chumvi", "uchungu", "chachu", "tamu",
    
    # Quality / Condition
    "safi", "salama", "kunywa", "kunya", "hayafai", "sumu", "ugonjwa", "maradhi",
    "kuhara", "kipindupindu", "kuharisha", "kuharibika", "kuharibika"
}

SHENG_TERMS: Set[str] = {
    "machopi", "ngweto", "dush", "ndula", "chafuka", "kuchafuka", "kunuka",
    "mbaya", "mbolea", "stinking", "dirty", "smelly", "boresha"
}

WATER_RELEVANCE_VOCABULARY: Set[str] = (
    ENGLISH_TERMS | KISWAHILI_TERMS | SHENG_TERMS
)


def extract_tokens(text: str) -> List[str]:
    """Extract normalized alphanumeric word tokens from raw text."""
    return re.findall(r"[a-zA-Z0-9_]+", text.lower())


def check_water_relevance(
    text: str,
    min_matches: int = WATER_RELEVANCE_MIN_MATCHES,
    vocabulary: Set[str] = WATER_RELEVANCE_VOCABULARY,
) -> Tuple[bool, int, List[str]]:
    """
    Evaluate if an observation contains sufficient water-quality relevant terms.

    Parameters
    ----------
    text : str
        The raw or preprocessed user input.
    min_matches : int, optional
        Minimum unique vocabulary terms required to pass the gate (default 2).
    vocabulary : set of str, optional
        Reference vocabulary set to check against.

    Returns
    -------
    (is_relevant, match_count, matched_terms)
        is_relevant: bool indicating whether min_matches threshold was met.
        match_count: number of distinct matched terms found.
        matched_terms: sorted list of distinct matched terms.
    """
    if not text or not text.strip():
        return False, 0, []

    tokens = set(extract_tokens(text))
    matched = sorted(tokens.intersection(vocabulary))
    match_count = len(matched)
    is_relevant = match_count >= min_matches

    return is_relevant, match_count, matched
