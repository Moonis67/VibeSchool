// src/lib/aiEngine.ts
// Client-side content generation engine — produces real educational content
// for every mode/format/setting combination when Supabase backend is unavailable.

/* ═══════════════════════════════════════════════════════════════════
   TOPIC KNOWLEDGE BASE
   Pre-built content for common topics. The engine uses these as seeds,
   then adapts based on mood, time, learning style, and education level.
   ═══════════════════════════════════════════════════════════════════ */

interface TopicKnowledge {
  title: string;
  summary: string;
  keyPoints: string[];
  definitions: Record<string, string>;
  examples: string[];
  formulas?: string[];
  analogies: string[];
  funFacts: string[];
  relatedTopics: string[];
  mermaidFlow: string;
  mermaidDLD: string;
  flashcardPairs: { front: string; back: string }[];
  mcqs: { q: string; a: string; b: string; c: string; d: string; correct: string }[];
  rapidFire: { q: string; a: string }[];
}

const KNOWLEDGE_BASE: Record<string, TopicKnowledge> = {
  // ---------- COMPUTER SCIENCE ----------
  "binary search": {
    title: "Binary Search Algorithm",
    summary: "Binary search is a highly efficient algorithm for finding an element in a sorted array. It works by repeatedly dividing the search interval in half, comparing the target value to the middle element. If the target matches, we're done. If the target is less, we search the left half; if greater, the right half. This gives us O(log n) time complexity — dramatically faster than linear search for large datasets.",
    keyPoints: [
      "The array MUST be sorted before applying binary search",
      "Time complexity is O(log n), space complexity is O(1) for iterative",
      "Each comparison eliminates half of the remaining elements",
      "Works on any ordered/sortable data type",
      "Can be implemented iteratively or recursively",
      "Used internally by many standard library functions (e.g., Arrays.binarySearch in Java, bisect in Python)"
    ],
    definitions: {
      "Binary Search": "A divide-and-conquer search algorithm that repeatedly halves the search space by comparing the target to the middle element of a sorted array.",
      "Time Complexity": "O(log n) — for an array of 1 million elements, binary search needs at most ~20 comparisons.",
      "Divide and Conquer": "A strategy that breaks a problem into smaller subproblems, solves them independently, and combines results.",
      "Search Space": "The portion of the array still being considered as potentially containing the target value."
    },
    examples: [
      "Searching for the word 'Mango' in a dictionary — you open to the middle, decide if 'Mango' is before or after, then repeat",
      "Finding a page in a 1000-page book: open to page 500, then 250 or 750, etc.",
      "Looking up a contact in a phone's sorted contact list"
    ],
    formulas: [
      "mid = low + (high - low) / 2",
      "Maximum comparisons = ⌊log₂(n)⌋ + 1",
      "For n = 1,000,000: max comparisons = 20"
    ],
    analogies: [
      "Binary search is like the number-guessing game: 'I'm thinking of a number between 1 and 100.' You always guess the middle, and I say 'higher' or 'lower'. You'll find it in at most 7 guesses!",
      "It's like looking up a word in a physical dictionary — you don't start at page 1 and go one by one. You flip to the middle and narrow down."
    ],
    funFacts: [
      "Binary search was first described by John Mauchly in 1946, but the first bug-free implementation wasn't published until 1962!",
      "Java's Arrays.binarySearch had a subtle overflow bug for 9 years before it was caught in 2006.",
      "A sorted array of every person on Earth (~8 billion) would need at most 33 binary search steps to find anyone."
    ],
    relatedTopics: ["Linear Search vs Binary Search", "Sorting Algorithms", "Binary Search Trees", "Interpolation Search", "Divide and Conquer"],
    mermaidFlow: `graph TD
    A["Start: low=0, high=n-1"] --> B{"Is low <= high?"}
    B -- Yes --> C["Calculate mid = low + (high-low)/2"]
    C --> D{"arr[mid] == target?"}
    D -- Yes --> E["Return mid (Found!)"]
    D -- No --> F{"arr[mid] < target?"}
    F -- Yes --> G["low = mid + 1"]
    F -- No --> H["high = mid - 1"]
    G --> B
    H --> B
    B -- No --> I["Return -1 (Not Found)"]
    style E fill:#22c55e,color:#fff
    style I fill:#ef4444,color:#fff`,
    mermaidDLD: `graph LR
    A["Comparator"] --> B{"A == B?"}
    B -- Yes --> C["Match Signal HIGH"]
    B -- No --> D{"A > B?"}
    D -- Yes --> E["Search RIGHT half"]
    D -- No --> F["Search LEFT half"]
    E --> G["Update LOW register"]
    F --> H["Update HIGH register"]
    G --> A
    H --> A
    style C fill:#22c55e,color:#fff`,
    flashcardPairs: [
      { front: "What is the time complexity of Binary Search?", back: "O(log n) — each step eliminates half of the remaining elements." },
      { front: "What is the key prerequisite for Binary Search?", back: "The array MUST be sorted in ascending or descending order." },
      { front: "How do you calculate the middle index safely?", back: "mid = low + (high - low) / 2 — this prevents integer overflow." },
      { front: "What happens when arr[mid] < target?", back: "The target must be in the RIGHT half, so we set low = mid + 1." },
      { front: "What happens when arr[mid] > target?", back: "The target must be in the LEFT half, so we set high = mid - 1." },
      { front: "How many comparisons for 1 million elements?", back: "At most 20 comparisons (log₂(1,000,000) ≈ 20)." },
      { front: "Binary Search vs Linear Search?", back: "Binary: O(log n) but needs sorted data. Linear: O(n) but works on unsorted data." }
    ],
    mcqs: [
      { q: "What is the time complexity of Binary Search?", a: "O(n)", b: "O(log n)", c: "O(n²)", d: "O(1)", correct: "B" },
      { q: "Binary Search requires the array to be:", a: "Empty", b: "Sorted", c: "Reversed", d: "Circular", correct: "B" },
      { q: "How is the middle index calculated safely?", a: "mid = (low + high) * 2", b: "mid = high - low", c: "mid = low + (high - low) / 2", d: "mid = low * high", correct: "C" },
      { q: "If arr[mid] > target, what happens next?", a: "low = mid + 1", b: "high = mid - 1", c: "Return mid", d: "Start over", correct: "B" },
      { q: "For an array of 1024 elements, max comparisons?", a: "10", b: "11", c: "512", d: "1024", correct: "B" }
    ],
    rapidFire: [
      { q: "What type of data structure does binary search need?", a: "Sorted array" },
      { q: "What is the Big-O time of binary search?", a: "O(log n)" },
      { q: "What paradigm does binary search use?", a: "Divide and conquer" },
      { q: "What does binary search return if element is not found?", a: "-1" },
      { q: "Formula for middle index?", a: "low + (high - low) / 2" }
    ]
  },

  "sorting algorithms": {
    title: "Sorting Algorithms",
    summary: "Sorting algorithms arrange elements in a specific order (ascending or descending). They are fundamental to computer science because sorted data enables efficient searching, merging, and analysis. Key algorithms include Bubble Sort (simple but slow O(n²)), Merge Sort (efficient divide-and-conquer O(n log n)), Quick Sort (fast average case O(n log n)), and Insertion Sort (efficient for nearly-sorted data).",
    keyPoints: [
      "Bubble Sort: Repeatedly swaps adjacent elements — O(n²) worst/average case",
      "Merge Sort: Divides array in half, sorts each, merges — O(n log n) guaranteed",
      "Quick Sort: Picks a pivot, partitions around it — O(n log n) average, O(n²) worst",
      "Insertion Sort: Builds sorted array one element at a time — O(n) best case",
      "Stability: A stable sort preserves the relative order of equal elements",
      "In-place: Algorithms like Quick Sort use O(1) extra space; Merge Sort uses O(n)"
    ],
    definitions: {
      "Stable Sort": "A sort that preserves the relative order of records with equal keys.",
      "In-Place Sort": "A sort that uses only O(1) extra memory beyond the input array.",
      "Pivot": "An element chosen in Quick Sort around which the array is partitioned.",
      "Merge": "Combining two sorted sub-arrays into one sorted array."
    },
    examples: [
      "Sorting a deck of cards by rank — you might use insertion sort (pick up cards one by one, insert in the right position)",
      "Organizing library books by call number",
      "Spreadsheet sort by column values"
    ],
    formulas: [
      "Bubble Sort: O(n²) comparisons, O(n²) swaps",
      "Merge Sort: O(n log n) always, O(n) extra space",
      "Quick Sort: O(n log n) average, O(n²) worst case"
    ],
    analogies: [
      "Bubble Sort is like bubbles rising in water — the largest values 'bubble up' to the end with each pass.",
      "Merge Sort is like organizing a messy pile of papers by splitting the pile in half repeatedly, sorting each small pile, then merging them back in order.",
      "Quick Sort is like organizing people by height: pick one person (the pivot), have everyone shorter go left and everyone taller go right, then repeat for each group."
    ],
    funFacts: [
      "Tim Sort (used by Python and Java) is a hybrid of Merge Sort and Insertion Sort, designed for real-world data patterns.",
      "Quick Sort was invented by Tony Hoare in 1959 when he was just 26 years old.",
      "Bogosort — the worst sorting algorithm — randomly shuffles the array until it happens to be sorted. Expected time: O(n × n!)."
    ],
    relatedTopics: ["Binary Search", "Time Complexity", "Space Complexity", "Data Structures", "Divide and Conquer"],
    mermaidFlow: `graph TD
    A["Unsorted Array"] --> B{"Choose Algorithm"}
    B --> C["Bubble Sort O(n²)"]
    B --> D["Merge Sort O(n log n)"]
    B --> E["Quick Sort O(n log n) avg"]
    B --> F["Insertion Sort O(n²)"]
    C --> G["Compare adjacent pairs"]
    G --> H["Swap if out of order"]
    H --> I["Repeat until sorted"]
    D --> J["Split array in half"]
    J --> K["Recursively sort halves"]
    K --> L["Merge sorted halves"]
    E --> M["Pick pivot element"]
    M --> N["Partition around pivot"]
    N --> O["Recursively sort partitions"]
    I --> P["Sorted Array ✓"]
    L --> P
    O --> P
    F --> Q["Insert each element in order"]
    Q --> P
    style P fill:#22c55e,color:#fff`,
    mermaidDLD: `graph LR
    A["Input Register A"] --> C["Comparator"]
    B["Input Register B"] --> C
    C --> D{"A > B?"}
    D -- Yes --> E["SWAP Gate Active"]
    D -- No --> F["PASS Through"]
    E --> G["Output: B, A"]
    F --> H["Output: A, B"]
    G --> I["Next Pair"]
    H --> I
    I --> C
    style E fill:#f59e0b,color:#000
    style F fill:#22c55e,color:#fff`,
    flashcardPairs: [
      { front: "What is Bubble Sort's time complexity?", back: "O(n²) — it compares every pair in each pass." },
      { front: "What makes Merge Sort special?", back: "Guaranteed O(n log n) time. Always consistent, never degrades." },
      { front: "What is Quick Sort's weakness?", back: "Worst case is O(n²) when the pivot is always the smallest or largest element." },
      { front: "What is a 'stable' sort?", back: "A sort that preserves the original relative order of equal elements." },
      { front: "Which sort is best for nearly-sorted data?", back: "Insertion Sort — it runs in O(n) when data is almost sorted." },
      { front: "What does 'in-place' mean for sorting?", back: "The algorithm uses O(1) extra memory — sorts within the original array." },
      { front: "What sort does Python use internally?", back: "Timsort — a hybrid of Merge Sort and Insertion Sort." }
    ],
    mcqs: [
      { q: "Which sorting algorithm has O(n log n) guaranteed time?", a: "Bubble Sort", b: "Quick Sort", c: "Merge Sort", d: "Selection Sort", correct: "C" },
      { q: "Quick Sort's worst case time complexity is:", a: "O(n)", b: "O(n log n)", c: "O(n²)", d: "O(log n)", correct: "C" },
      { q: "Which sort is best for nearly-sorted data?", a: "Merge Sort", b: "Insertion Sort", c: "Heap Sort", d: "Bubble Sort", correct: "B" },
      { q: "What does 'stable sort' mean?", a: "Never crashes", b: "Preserves order of equal elements", c: "Always O(n log n)", d: "Uses no extra memory", correct: "B" },
      { q: "Which algorithm uses a 'pivot' element?", a: "Merge Sort", b: "Bubble Sort", c: "Quick Sort", d: "Insertion Sort", correct: "C" }
    ],
    rapidFire: [
      { q: "Bubble Sort time complexity?", a: "O(n²)" },
      { q: "Merge Sort space complexity?", a: "O(n)" },
      { q: "Is Quick Sort stable?", a: "No" },
      { q: "Best sort for small arrays?", a: "Insertion Sort" },
      { q: "Who invented Quick Sort?", a: "Tony Hoare" }
    ]
  },

  "object oriented programming": {
    title: "Object-Oriented Programming (OOP)",
    summary: "Object-Oriented Programming is a programming paradigm that organizes code into 'objects' — self-contained units that bundle data (attributes) and behavior (methods) together. The four pillars of OOP are Encapsulation, Abstraction, Inheritance, and Polymorphism. OOP makes code modular, reusable, and easier to maintain, which is why languages like Java, Python, C++, and C# are built around it.",
    keyPoints: [
      "Encapsulation: Bundling data and methods together, hiding internal state",
      "Abstraction: Showing only essential features, hiding complexity",
      "Inheritance: Creating new classes from existing ones (parent → child)",
      "Polymorphism: Same interface, different implementations",
      "Classes are blueprints; Objects are instances of classes",
      "Constructor initializes an object's state when created"
    ],
    definitions: {
      "Class": "A blueprint or template that defines the properties and behaviors of objects.",
      "Object": "An instance of a class — a concrete entity with actual values.",
      "Encapsulation": "Restricting direct access to some components and bundling data with methods.",
      "Inheritance": "A mechanism where a child class inherits properties and methods from a parent class.",
      "Polymorphism": "The ability of different objects to respond to the same method call in different ways.",
      "Abstraction": "Hiding complex implementation details and showing only the necessary interface."
    },
    examples: [
      "A Car class has properties (color, speed) and methods (drive, brake). Each car you create is an object.",
      "A Dog inherits from Animal — it gets walk() and breathe() for free, but adds its own bark() method.",
      "A Shape interface with draw() — Circle draws a circle, Square draws a square (polymorphism)."
    ],
    analogies: [
      "A Class is like a cookie cutter — it defines the shape. Objects are the actual cookies made from it.",
      "Encapsulation is like a TV remote — you press buttons (interface) without knowing the circuit board inside (implementation).",
      "Inheritance is like genetics — children inherit traits from parents but can also develop their own unique features."
    ],
    funFacts: [
      "The first OOP language was Simula, created in Norway in 1967.",
      "Alan Kay coined the term 'Object-Oriented Programming' and said 'I made up the term... and C++ is not what I had in mind.'",
      "Some modern languages like Go deliberately avoid classical inheritance, favoring composition instead."
    ],
    relatedTopics: ["Design Patterns", "SOLID Principles", "Data Structures", "UML Diagrams", "Functional Programming vs OOP"],
    mermaidFlow: `graph TD
    A["Define a Class"] --> B["Properties (Data)"]
    A --> C["Methods (Behavior)"]
    B --> D["Create Objects (Instances)"]
    C --> D
    D --> E{"Apply OOP Pillars"}
    E --> F["Encapsulation: Hide internal state"]
    E --> G["Inheritance: Extend parent class"]
    E --> H["Polymorphism: Override methods"]
    E --> I["Abstraction: Simplify interface"]
    F --> J["Maintainable Code ✓"]
    G --> J
    H --> J
    I --> J
    style J fill:#22c55e,color:#fff`,
    mermaidDLD: `graph LR
    A["Class Definition Module"] --> B["Attribute Register"]
    A --> C["Method Dispatch Table"]
    B --> D["Object Instance Memory"]
    C --> D
    D --> E{"Message Received"}
    E --> F["Lookup in vtable"]
    F --> G["Execute Method"]
    G --> H["Return Result"]
    style D fill:#6366f1,color:#fff`,
    flashcardPairs: [
      { front: "What are the 4 pillars of OOP?", back: "Encapsulation, Abstraction, Inheritance, and Polymorphism." },
      { front: "What is the difference between a Class and an Object?", back: "A Class is the blueprint/template. An Object is an actual instance created from that blueprint." },
      { front: "What is Encapsulation?", back: "Bundling data and methods together while restricting direct access to internal state (using private/public)." },
      { front: "What is Polymorphism?", back: "The ability of different classes to be treated through the same interface, with each providing its own implementation." },
      { front: "What is Inheritance?", back: "A mechanism where a child class inherits properties and methods from a parent class, promoting code reuse." },
      { front: "What is Abstraction?", back: "Hiding complex implementation details and exposing only the essential interface to the user." },
      { front: "What is a Constructor?", back: "A special method that initializes an object's state when the object is first created." }
    ],
    mcqs: [
      { q: "Which is NOT a pillar of OOP?", a: "Encapsulation", b: "Compilation", c: "Inheritance", d: "Polymorphism", correct: "B" },
      { q: "A Class is best described as:", a: "An instance", b: "A blueprint", c: "A variable", d: "A function", correct: "B" },
      { q: "Hiding internal state is called:", a: "Polymorphism", b: "Inheritance", c: "Encapsulation", d: "Compilation", correct: "C" },
      { q: "A child class inherits from a:", a: "Sibling class", b: "Interface only", c: "Parent class", d: "Object", correct: "C" },
      { q: "Same method name, different behavior is:", a: "Overloading only", b: "Encapsulation", c: "Polymorphism", d: "Abstraction", correct: "C" }
    ],
    rapidFire: [
      { q: "What are objects created from?", a: "Classes" },
      { q: "Hiding implementation details is called?", a: "Abstraction" },
      { q: "Can a child class override parent methods?", a: "Yes" },
      { q: "First OOP language?", a: "Simula" },
      { q: "Bundling data and methods together?", a: "Encapsulation" }
    ]
  },

  "photosynthesis": {
    title: "Photosynthesis",
    summary: "Photosynthesis is the process by which green plants, algae, and some bacteria convert light energy (usually from the Sun) into chemical energy stored in glucose. It occurs primarily in the chloroplasts of plant cells, using chlorophyll to capture light. The overall equation is: 6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂. This process is the foundation of nearly all life on Earth, as it produces both the food and oxygen that most organisms depend on.",
    keyPoints: [
      "Occurs in chloroplasts, specifically in the thylakoid membranes and stroma",
      "Two main stages: Light-dependent reactions and the Calvin Cycle (light-independent)",
      "Light reactions produce ATP and NADPH using water and sunlight",
      "Calvin Cycle uses ATP and NADPH to fix CO₂ into glucose (carbon fixation)",
      "Oxygen is released as a byproduct of splitting water molecules",
      "Chlorophyll absorbs red and blue light, reflects green (that's why plants look green)"
    ],
    definitions: {
      "Chloroplast": "The organelle in plant cells where photosynthesis takes place.",
      "Chlorophyll": "The green pigment that captures light energy for photosynthesis.",
      "Calvin Cycle": "The light-independent reactions that fix CO₂ into glucose using ATP and NADPH.",
      "Carbon Fixation": "The process of converting inorganic CO₂ into organic molecules (glucose).",
      "Thylakoid": "Membrane-bound compartments inside chloroplasts where light reactions occur."
    },
    examples: [
      "A leaf turning toward sunlight to maximize photosynthesis",
      "Aquatic plants releasing oxygen bubbles underwater — that's photosynthesis in action",
      "Greenhouses use supplemental light to boost crop photosynthesis rates"
    ],
    formulas: [
      "6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂",
      "Light reactions: H₂O → O₂ + ATP + NADPH",
      "Calvin Cycle: CO₂ + ATP + NADPH → G3P → Glucose"
    ],
    analogies: [
      "Photosynthesis is like a solar-powered food factory: sunlight is the electricity, CO₂ and water are raw materials, and glucose is the finished product.",
      "The Calvin Cycle is like an assembly line — it takes the energy (ATP/NADPH) produced by the light reactions and uses it to build sugar molecules from CO₂ parts."
    ],
    funFacts: [
      "About 70% of Earth's oxygen comes from ocean-dwelling phytoplankton, not land plants.",
      "A single large tree can produce enough oxygen for 2-4 people per day.",
      "Some deep-sea organisms perform chemosynthesis instead — using chemical energy from hydrothermal vents."
    ],
    relatedTopics: ["Cellular Respiration", "Carbon Cycle", "Plant Biology", "Ecology", "Climate Change"],
    mermaidFlow: `graph TD
    A["Sunlight ☀️"] --> B["Chloroplast"]
    C["Water H₂O"] --> B
    D["Carbon Dioxide CO₂"] --> B
    B --> E["Light Reactions (Thylakoid)"]
    E --> F["ATP + NADPH produced"]
    E --> G["O₂ released"]
    F --> H["Calvin Cycle (Stroma)"]
    D --> H
    H --> I["Glucose C₆H₁₂O₆"]
    I --> J["Energy for the plant 🌱"]
    style I fill:#22c55e,color:#fff
    style G fill:#3b82f6,color:#fff`,
    mermaidDLD: `graph LR
    A["Light Input"] --> B["Photosystem II"]
    B --> C["Electron Transport Chain"]
    C --> D["Photosystem I"]
    D --> E["NADPH Output"]
    C --> F["ATP Synthase"]
    F --> G["ATP Output"]
    E --> H["Calvin Cycle"]
    G --> H
    H --> I["Glucose"]
    style I fill:#22c55e,color:#fff`,
    flashcardPairs: [
      { front: "What is the overall equation of photosynthesis?", back: "6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂" },
      { front: "Where does photosynthesis occur?", back: "In the chloroplasts of plant cells — specifically the thylakoids and stroma." },
      { front: "What are the two main stages?", back: "1) Light-dependent reactions (in thylakoids) and 2) Calvin Cycle / Light-independent reactions (in stroma)." },
      { front: "What pigment captures light?", back: "Chlorophyll — it absorbs red and blue light and reflects green." },
      { front: "What is carbon fixation?", back: "The process of converting inorganic CO₂ into organic glucose molecules in the Calvin Cycle." },
      { front: "What is the byproduct of photosynthesis?", back: "Oxygen (O₂) — released from splitting water molecules." },
      { front: "Why are plants green?", back: "Chlorophyll absorbs red and blue wavelengths but reflects green light." }
    ],
    mcqs: [
      { q: "Where does photosynthesis primarily occur?", a: "Mitochondria", b: "Nucleus", c: "Chloroplasts", d: "Ribosomes", correct: "C" },
      { q: "What is the byproduct of photosynthesis?", a: "CO₂", b: "Nitrogen", c: "Oxygen", d: "Methane", correct: "C" },
      { q: "The Calvin Cycle occurs in the:", a: "Thylakoid membrane", b: "Stroma", c: "Cytoplasm", d: "Cell wall", correct: "B" },
      { q: "Which pigment is essential for photosynthesis?", a: "Melanin", b: "Hemoglobin", c: "Chlorophyll", d: "Carotene only", correct: "C" },
      { q: "What is fixed in the Calvin Cycle?", a: "Oxygen", b: "Water", c: "Carbon dioxide", d: "Nitrogen", correct: "C" }
    ],
    rapidFire: [
      { q: "What organelle does photosynthesis?", a: "Chloroplast" },
      { q: "Byproduct gas of photosynthesis?", a: "Oxygen" },
      { q: "What does chlorophyll do?", a: "Captures light energy" },
      { q: "Calvin Cycle produces?", a: "Glucose" },
      { q: "Why are plants green?", a: "Chlorophyll reflects green light" }
    ]
  },

  "newton's laws": {
    title: "Newton's Three Laws of Motion",
    summary: "Sir Isaac Newton's three laws of motion form the foundation of classical mechanics. The First Law (Inertia) states that an object remains at rest or in uniform motion unless acted upon by a net external force. The Second Law (F=ma) states that force equals mass times acceleration. The Third Law states that every action has an equal and opposite reaction. These laws explain everything from why a ball rolls to how rockets fly.",
    keyPoints: [
      "1st Law (Inertia): Objects resist changes to their state of motion",
      "2nd Law (F=ma): Net force equals mass multiplied by acceleration",
      "3rd Law (Action-Reaction): Forces always come in equal and opposite pairs",
      "Newton published these in 'Principia Mathematica' in 1687",
      "These laws work perfectly for everyday speeds (not near light speed — that's Einstein's domain)",
      "Weight = mass × gravitational acceleration (W = mg)"
    ],
    definitions: {
      "Inertia": "The tendency of an object to resist changes in its state of motion.",
      "Force": "A push or pull that can cause an object to accelerate. Measured in Newtons (N).",
      "Acceleration": "The rate of change of velocity over time. a = Δv/Δt.",
      "Net Force": "The vector sum of all forces acting on an object.",
      "Normal Force": "The perpendicular contact force exerted by a surface on an object."
    },
    examples: [
      "A hockey puck sliding on ice keeps moving (1st law — low friction means little net force)",
      "Pushing a shopping cart: more force = more acceleration; heavier cart = less acceleration (2nd law)",
      "Jumping: your feet push Earth down, Earth pushes you up (3rd law)"
    ],
    formulas: [
      "F = m × a (Force = mass × acceleration)",
      "W = m × g (Weight = mass × gravitational acceleration)",
      "g ≈ 9.8 m/s² on Earth's surface"
    ],
    analogies: [
      "1st Law: A ball on a table stays put until you flick it. In space, a thrown ball would fly forever because there's no air resistance to stop it.",
      "2nd Law: Imagine pushing a bicycle vs pushing a truck with the same force — the bicycle accelerates much more because it has less mass.",
      "3rd Law: When you sit in a chair, you push down on it (your weight). The chair pushes UP on you with equal force — that's why you don't fall through!"
    ],
    funFacts: [
      "Newton supposedly developed his theory of gravity after watching an apple fall from a tree in 1666.",
      "The unit of force 'Newton' is named after him — 1 Newton is about the weight of a small apple.",
      "Newton's laws break down at very high speeds (near light speed) and very small scales (quantum)."
    ],
    relatedTopics: ["Gravity", "Friction", "Momentum", "Energy Conservation", "Kinematics"],
    mermaidFlow: `graph TD
    A["Newton's Laws of Motion"] --> B["1st Law: Inertia"]
    A --> C["2nd Law: F = ma"]
    A --> D["3rd Law: Action-Reaction"]
    B --> E["Object at rest stays at rest"]
    B --> F["Object in motion stays in motion"]
    C --> G["Force = Mass × Acceleration"]
    C --> H["More mass = less acceleration"]
    D --> I["Every force has an equal opposite"]
    D --> J["Example: Rocket pushes gas down, gas pushes rocket up"]
    style A fill:#6366f1,color:#fff`,
    mermaidDLD: `graph LR
    A["Mass Input"] --> C["Multiplier Circuit"]
    B["Acceleration Input"] --> C
    C --> D["Force Output = M × A"]
    D --> E["Comparator"]
    F["External Force"] --> E
    E --> G{"Net Force > 0?"}
    G -- Yes --> H["Object Accelerates"]
    G -- No --> I["Object at Rest/Constant Velocity"]
    style H fill:#f59e0b,color:#000
    style I fill:#22c55e,color:#fff`,
    flashcardPairs: [
      { front: "State Newton's First Law", back: "An object at rest stays at rest, and an object in motion stays in uniform motion, unless acted upon by a net external force." },
      { front: "State Newton's Second Law", back: "F = ma — The net force acting on an object equals its mass times its acceleration." },
      { front: "State Newton's Third Law", back: "For every action, there is an equal and opposite reaction." },
      { front: "What is inertia?", back: "The tendency of an object to resist changes in its state of motion. More mass = more inertia." },
      { front: "What unit is force measured in?", back: "Newtons (N). 1 N = 1 kg⋅m/s²." },
      { front: "What is weight?", back: "W = mg — the force of gravity acting on a mass. Weight changes with gravity; mass doesn't." },
      { front: "Why does a rocket work in space?", back: "3rd Law: The rocket pushes exhaust gases backward; the gases push the rocket forward." }
    ],
    mcqs: [
      { q: "Newton's First Law is also called the Law of:", a: "Acceleration", b: "Gravity", c: "Inertia", d: "Energy", correct: "C" },
      { q: "F = ma is Newton's:", a: "First Law", b: "Second Law", c: "Third Law", d: "Law of Gravity", correct: "B" },
      { q: "A 10 kg object with 20 N force has acceleration:", a: "200 m/s²", b: "2 m/s²", c: "10 m/s²", d: "0.5 m/s²", correct: "B" },
      { q: "Which law explains rocket propulsion?", a: "First Law", b: "Second Law", c: "Third Law", d: "None", correct: "C" },
      { q: "Unit of force is:", a: "Joule", b: "Watt", c: "Newton", d: "Pascal", correct: "C" }
    ],
    rapidFire: [
      { q: "F = ma is which law?", a: "Newton's Second Law" },
      { q: "What is inertia?", a: "Resistance to change in motion" },
      { q: "Unit of force?", a: "Newton" },
      { q: "Value of g on Earth?", a: "9.8 m/s²" },
      { q: "Action-reaction is which law?", a: "Third Law" }
    ]
  },

  "world war 2": {
    title: "World War II (1939–1945)",
    summary: "World War II was the deadliest and most widespread conflict in human history, involving over 70 countries and resulting in an estimated 70–85 million deaths. It began when Nazi Germany under Adolf Hitler invaded Poland on September 1, 1939, prompting Britain and France to declare war. The conflict was fought between the Allies (UK, USA, USSR, France, China) and the Axis powers (Germany, Italy, Japan). Key events include the Battle of Stalingrad, D-Day, the Holocaust, and the atomic bombings of Hiroshima and Nagasaki. The war ended in 1945 with the unconditional surrender of Germany and Japan.",
    keyPoints: [
      "Started September 1, 1939 with Germany's invasion of Poland",
      "Major theaters: European, Pacific, North African, Eastern Front",
      "The Holocaust: Systematic genocide of 6 million Jews by Nazi Germany",
      "D-Day (June 6, 1944): Allied invasion of Normandy — turning point in Europe",
      "Atomic bombs dropped on Hiroshima (Aug 6) and Nagasaki (Aug 9), 1945",
      "Led to creation of the United Nations and the Cold War era"
    ],
    definitions: {
      "Axis Powers": "The alliance of Germany, Italy, and Japan during WWII.",
      "Allied Powers": "The coalition opposing the Axis, primarily UK, USA, USSR, France, and China.",
      "Blitzkrieg": "German 'lightning war' tactic — rapid, concentrated attacks using tanks and air support.",
      "D-Day": "June 6, 1944 — the Allied invasion of Normandy, France. The largest seaborne invasion in history.",
      "The Holocaust": "The systematic, state-sponsored persecution and murder of six million Jews by the Nazi regime."
    },
    examples: [
      "The Battle of Stalingrad (1942-43) — a brutal turning point on the Eastern Front where the USSR defeated Germany",
      "Pearl Harbor (Dec 7, 1941) — Japan's surprise attack that brought the United States into the war",
      "The Normandy landings involved over 156,000 troops crossing the English Channel"
    ],
    analogies: [
      "Blitzkrieg was like a flash flood — overwhelming force concentrated at one point, breaking through before defenses could react.",
      "The war's alliance system was like a chain reaction — one invasion triggered a cascade of declarations."
    ],
    funFacts: [
      "The longest battle of WWII was the Battle of the Atlantic, lasting from 1939 to 1945.",
      "More Soviet citizens died in WWII than any other nation — an estimated 27 million people.",
      "WWII cost an estimated $1.5 trillion (1940s dollars) — equivalent to trillions in today's money."
    ],
    relatedTopics: ["World War I", "The Cold War", "The Holocaust", "Nuclear Weapons", "United Nations Formation"],
    mermaidFlow: `graph TD
    A["1939: Germany invades Poland"] --> B["Britain & France declare war"]
    B --> C["1940: Fall of France"]
    C --> D["1941: Germany invades USSR"]
    D --> E["1941: Pearl Harbor - USA enters"]
    E --> F["1942-43: Battle of Stalingrad"]
    F --> G["1944: D-Day Normandy Invasion"]
    G --> H["1945: Germany surrenders (May)"]
    E --> I["1942-45: Pacific Theater"]
    I --> J["1945: Atomic Bombs"]
    J --> K["1945: Japan surrenders (Aug)"]
    H --> L["End of WWII"]
    K --> L
    style L fill:#22c55e,color:#fff`,
    mermaidDLD: `graph LR
    A["Axis Powers"] --> D["Conflict"]
    B["Allied Powers"] --> D
    D --> E["European Theater"]
    D --> F["Pacific Theater"]
    D --> G["North African Theater"]
    E --> H["Allied Victory Europe May 1945"]
    F --> I["Allied Victory Pacific Aug 1945"]
    style H fill:#22c55e,color:#fff
    style I fill:#22c55e,color:#fff`,
    flashcardPairs: [
      { front: "When did WWII begin?", back: "September 1, 1939 — when Nazi Germany invaded Poland." },
      { front: "What were the Axis Powers?", back: "Germany, Italy, and Japan." },
      { front: "What was D-Day?", back: "June 6, 1944 — the Allied invasion of Normandy, France. The largest seaborne invasion in history." },
      { front: "What brought the USA into WWII?", back: "Japan's surprise attack on Pearl Harbor on December 7, 1941." },
      { front: "How did WWII end in the Pacific?", back: "The US dropped atomic bombs on Hiroshima (Aug 6) and Nagasaki (Aug 9), 1945. Japan surrendered on August 15." },
      { front: "What was the Holocaust?", back: "The systematic genocide of approximately 6 million Jews by the Nazi regime." },
      { front: "What was created after WWII to prevent future wars?", back: "The United Nations (UN), established in 1945." }
    ],
    mcqs: [
      { q: "When did WWII begin?", a: "1935", b: "1939", c: "1941", d: "1945", correct: "B" },
      { q: "What event brought the US into WWII?", a: "D-Day", b: "Fall of France", c: "Pearl Harbor", d: "Battle of Britain", correct: "C" },
      { q: "D-Day occurred on:", a: "June 6, 1944", b: "Dec 7, 1941", c: "May 8, 1945", d: "Aug 6, 1945", correct: "A" },
      { q: "Which was NOT an Axis power?", a: "Germany", b: "Italy", c: "France", d: "Japan", correct: "C" },
      { q: "The atomic bomb was first used on:", a: "Tokyo", b: "Berlin", c: "Hiroshima", d: "Nagasaki", correct: "C" }
    ],
    rapidFire: [
      { q: "Year WWII started?", a: "1939" },
      { q: "Leader of Nazi Germany?", a: "Adolf Hitler" },
      { q: "What was D-Day?", a: "Allied invasion of Normandy" },
      { q: "First city to be atomic bombed?", a: "Hiroshima" },
      { q: "Organization created after WWII?", a: "United Nations" }
    ]
  }
};

/* ═══════════════════════════════════════════════════════════════════
   HELPER UTILITIES
   ═══════════════════════════════════════════════════════════════════ */

function findKnowledge(topic: string): TopicKnowledge | null {
  const lower = topic.toLowerCase().trim();
  const aliases: Record<string, string> = {
    "oop": "object oriented programming",
    "o.o.p": "object oriented programming",
    "object-oriented programming": "object oriented programming",
    "object-oriented": "object oriented programming",
    "objects and classes": "object oriented programming",
  };
  if (aliases[lower] && KNOWLEDGE_BASE[aliases[lower]]) return KNOWLEDGE_BASE[aliases[lower]];
  // Direct match
  if (KNOWLEDGE_BASE[lower]) return KNOWLEDGE_BASE[lower];
  // Partial match
  for (const [key, val] of Object.entries(KNOWLEDGE_BASE)) {
    if (lower.includes(key) || key.includes(lower)) return val;
  }
  // Keyword match
  for (const [key, val] of Object.entries(KNOWLEDGE_BASE)) {
    const words = lower.split(/\s+/);
    const keyWords = key.split(/\s+/);
    const overlap = words.filter(w => keyWords.some(kw => kw.includes(w) || w.includes(kw)));
    if (overlap.length >= 1) return val;
  }
  return null;
}

function getContentLength(time: string): "short" | "medium" | "long" {
  const mins = parseInt(time) || 15;
  if (mins <= 5) return "short";
  if (mins <= 15) return "medium";
  return "long";
}

function applyMood(text: string, mood: string): string {
  switch (mood) {
    case "funny":
      return text
        .replace(/\. /g, "! 😄 ")
        .replace("## ", "## 🎉 ")
        + "\n\n> 💡 Remember: Learning should be fun! Keep that brain muscle working! 💪";
    case "strict":
      return text
        .replace(/!/g, ".")
        .replace("## ", "## ⚠️ ")
        + "\n\n> ⚠️ Key takeaway: Master these concepts thoroughly. No shortcuts.";
    case "enthusiastic":
      return text
        .replace(/\. /g, "! 🔥 ")
        .replace("## ", "## 🚀 ")
        + "\n\n> 🔥 You're doing AMAZING! Keep pushing forward — knowledge is POWER! 💪🚀";
    case "encouraging":
      return text
        .replace("## ", "## 💖 ")
        + "\n\n> 🌟 You've got this! Every expert was once a beginner. Keep going, you're making great progress! 💖";
    case "professional":
      return text + "\n\n> 📋 Summary: Review the key definitions and apply them to practice problems for optimal retention.";
    default:
      return text;
  }
}

function adjustForEduLevel(text: string, eduLevel: string, grade?: string): string {
  if (eduLevel === "school") {
    return text
      .replace(/paradigm/gi, "approach")
      .replace(/instantiate/gi, "create")
      .replace(/polymorphism/gi, "many forms (polymorphism)")
      .replace(/abstraction/gi, "hiding complexity (abstraction)")
      .replace(/algorithm/gi, "step-by-step process (algorithm)");
  }
  return text;
}

function applyAdaptiveTone(text: string, mood: string): string {
  switch (mood) {
    case "funny":
      return text + "\n\n## Quick Reality Check\n\nIf this topic feels like a locked door, the key is usually one boring-looking definition. Find that definition, and suddenly the door stops acting so dramatic.";
    case "strict":
      return text.replace(/!/g, ".") + "\n\n## Must Know\n\nNo shortcuts: define the core terms, explain one example, then test yourself without notes.";
    case "enthusiastic":
      return text + "\n\n## Momentum Move\n\nSay the main idea out loud in one sentence, then immediately solve or explain one small example.";
    case "encouraging":
      return text + "\n\n## Gentle Checkpoint\n\nIf any term feels fuzzy, pause there. Confusion is usually a signpost, not a failure.";
    case "professional":
      return text + "\n\n## Professional Summary\n\nReview the key definitions, map them to a practical scenario, and apply them in a short exercise.";
    case "socratic":
      return text + "\n\n## Socratic Check\n\nWhat problem does this idea solve? What would break if it did not exist? Can you explain it with one example?";
    default:
      return text;
  }
}

function applyProfileFrame(text: string, goal = "concept", experience = "beginner", context = "general learning", style = "academic"): string {
  const experienceLine = experience === "advanced"
    ? "I will include nuance, edge cases, and precision."
    : experience === "rusty"
      ? "I will refresh missing links before moving forward."
      : experience === "intermediate"
        ? "I will move quickly but still verify the foundations."
        : "I will assume no prior confidence and define terms clearly.";

  const goalLine = goal === "exam"
    ? "Focus: exam traps, recall cues, and likely MCQ phrasing."
    : goal === "interview"
      ? "Focus: short verbal explanations and compare/contrast answers."
      : goal === "project"
        ? "Focus: practical usage, implementation choices, and tradeoffs."
        : "Focus: deep understanding before memorization.";

  const styleLine = style === "visual"
    ? "Style: visual frameworks, mental maps, and labeled steps."
    : style === "analogical"
      ? "Style: analogies first, then formal definitions."
      : style === "socratic"
        ? "Style: guided questions followed by clear answers."
        : "Style: structured definitions, examples, and self-checks.";

  return `${text}\n\n## Personalized Focus\n\n* ${experienceLine}\n* ${goalLine}\n* ${styleLine}\n* Context: ${context}`;
}

/* ═══════════════════════════════════════════════════════════════════
   GENERIC CONTENT GENERATORS (for topics not in knowledge base)
   ═══════════════════════════════════════════════════════════════════ */

function generateGenericLecture(topic: string, style: string, mood: string, time: string, eduLevel: string, goal = "concept", experience = "beginner", profileContext = "general learning"): string {
  const length = getContentLength(time);
  const intro = `## Introduction to ${topic}\n\n${topic} is a fascinating area of study that connects to many real-world applications. Let's explore its core concepts, key principles, and practical implications.\n\n`;
  
  const coreContent = `---\n\n## Core Concepts\n\nUnderstanding ${topic} begins with grasping its fundamental building blocks:\n\n* **Foundation**: The basic principles that form the backbone of ${topic}\n* **Key Components**: The essential elements that make up this domain\n* **Relationships**: How different aspects of ${topic} connect and interact with each other\n* **Applications**: Real-world scenarios where ${topic} is applied\n\n`;

  const deepDive = length !== "short" ? `---\n\n## Deep Dive\n\n${topic} has evolved significantly over time. Modern understanding incorporates multiple perspectives and approaches:\n\n* The theoretical framework provides a structured way to analyze and predict outcomes\n* Practical applications demonstrate the real-world value of mastering these concepts\n* Research continues to expand our understanding, revealing new connections and possibilities\n\n> Understanding ${topic} at a deeper level opens doors to advanced study and professional applications.\n\n` : "";

  const practice = length === "long" ? `---\n\n## Practice & Application\n\nTo truly master ${topic}, consider these exercises:\n\n* Start with the basics and build up gradually\n* Work through examples step by step\n* Connect new concepts to things you already know\n* Test yourself regularly to reinforce learning\n* Discuss with peers to gain different perspectives\n\n` : "";

  let styleWrapper = "";
  if (style === "socratic") {
    styleWrapper = `---\n\n## Reflection Questions\n\n* What do you think is the most important aspect of ${topic}?\n* How does ${topic} connect to what you already know?\n* Can you think of a real-world example where ${topic} applies?\n* What would happen if the core principles of ${topic} were different?\n\n`;
  } else if (style === "analogical") {
    styleWrapper = `---\n\n## Understanding Through Analogy\n\nThink of ${topic} like building a house:\n* **Foundation** = Core principles (without these, nothing stands)\n* **Walls** = Supporting concepts (they give structure)\n* **Roof** = Advanced applications (the protection and purpose)\n* **Interior** = Your personal understanding (what makes it yours)\n\n`;
  } else if (style === "visual") {
    styleWrapper = `---\n\n## Visual Framework\n\nImagine ${topic} as a tree:\n* 🌱 **Roots** = Fundamental concepts buried deep in theory\n* 🪵 **Trunk** = Core principles that everything grows from\n* 🌿 **Branches** = Specialized areas and applications\n* 🍎 **Fruits** = The practical outcomes and results\n\n`;
  }

  let result = intro + coreContent + deepDive + practice + styleWrapper;
  result = adjustForEduLevel(result, eduLevel);
  result = applyProfileFrame(result, goal, experience, profileContext, style);
  result = applyAdaptiveTone(result, mood);
  return result;
}

function generateGenericFlashcards(topic: string): string {
  return [
    `## What is ${topic}?\n\n${topic} is a key area of study involving fundamental concepts, principles, and real-world applications that are essential for understanding the broader field.`,
    `## Key Principle #1\n\nThe first fundamental principle of ${topic} establishes the foundational framework upon which all other concepts are built.`,
    `## Key Principle #2\n\nThe second core concept of ${topic} introduces relationships and interactions between the fundamental building blocks.`,
    `## Important Application\n\n${topic} is applied in numerous real-world scenarios, from everyday problem-solving to advanced professional and research contexts.`,
    `## Common Misconception\n\nA frequently misunderstood aspect of ${topic} is that surface-level knowledge is sufficient. True mastery requires deep understanding of underlying principles.`,
    `## Historical Context\n\n${topic} has evolved significantly over time, with key contributions from researchers and practitioners who shaped our modern understanding.`,
    `## Future Directions\n\nOngoing research in ${topic} continues to reveal new insights, applications, and connections to other fields of study.`
  ].join("\n\n---\n\n");
}

function generateGenericMCQ(topic: string, difficulty = "basic"): string {
  const advanced = difficulty === "advanced";
  return [
    `### Q: What is the primary focus of ${topic}? | A) Surface-level memorization | B) Deep understanding of core principles | C) Random facts collection | D) Speed reading | Correct: B | Area: Definitions ###`,
    `### Q: Which approach is most effective for learning ${topic}? | A) Passive reading only | B) Active practice and application | C) Ignoring foundational concepts | D) Skipping directly to advanced topics | Correct: B | Area: Study Strategy ###`,
    `### Q: ${topic} is best described as: | A) An isolated field with no connections | B) A static body of knowledge | C) An evolving field with practical applications | D) Only theoretical with no real-world use | Correct: C | Area: Core Concepts ###`,
    `### Q: To master ${topic}, one should: | A) Memorize everything without understanding | B) Build from foundations to advanced concepts | C) Skip the basics | D) Only study before an exam | Correct: B | Area: Foundations ###`,
    `### Q: The most important skill in studying ${topic} is: | A) Speed memorization | B) Critical thinking and analysis | C) Avoiding questions | D) Copying notes without reading | Correct: B | Area: Reasoning ###`,
    `### Q: A good first example for ${topic} should be: | A) Huge and complex | B) Small enough to trace step by step | C) Unrelated to the concept | D) Hidden behind jargon | Correct: B | Area: Application ###`,
    `### Q: If a learner cannot explain ${topic} simply, they likely need to improve: | A) Font size | B) Foundational understanding | C) Test speed only | D) Note color | Correct: B | Area: Communication ###`,
    `### Q: What makes a misconception dangerous in ${topic}? | A) It can feel correct while causing wrong decisions | B) It is always obvious | C) It never affects practice | D) It only appears in old books | Correct: A | Area: Misconceptions ###`,
    advanced
      ? `### Q: In an unfamiliar ${topic} scenario, the best move is to: | A) Match surface keywords only | B) Identify the underlying principle before choosing a method | C) Guess the longest option | D) Ignore constraints | Correct: B | Area: Advanced Application ###`
      : `### Q: When stuck on ${topic}, the best next step is to: | A) Restart from one clear definition | B) Skip the topic forever | C) Memorize random examples | D) Avoid practice | Correct: A | Area: Recovery Strategy ###`,
    advanced
      ? `### Q: Which answer best shows advanced understanding of ${topic}? | A) Repeating a definition | B) Explaining tradeoffs and when the idea fails | C) Naming the topic only | D) Choosing a shortcut without reason | Correct: B | Area: Edge Cases ###`
      : `### Q: A strong sign you understand ${topic} is that you can: | A) Teach one example without notes | B) Only recognize the title | C) Avoid questions | D) Copy the textbook exactly | Correct: A | Area: Recall ###`
  ].join("\n");
}

function generateGenericRapid(topic: string): string {
  return [
    `### Q: What is ${topic} primarily about? | A: Understanding core principles and their applications ###`,
    `### Q: Name one key concept in ${topic}. | A: Fundamental principles ###`,
    `### Q: Why is ${topic} important? | A: It has real-world applications ###`,
    `### Q: What approach works best for learning ${topic}? | A: Active practice and application ###`,
    `### Q: How has ${topic} evolved over time? | A: Through research and new discoveries ###`
  ].join("\n");
}

function generateGenericMermaid(topic: string, format: string): string {
  if (format === "dld") {
    return `graph LR
    A["Input: ${topic} Concepts"] --> B["Processing Unit"]
    B --> C{"Analysis Gate"}
    C -- Pass --> D["Core Knowledge Register"]
    C -- Fail --> E["Review Buffer"]
    E --> B
    D --> F["Application Output"]
    F --> G["Mastery Achieved ✓"]
    style G fill:#22c55e,color:#fff
    style E fill:#f59e0b,color:#000`;
  }
  return `graph TD
    A["Start: Learn ${topic}"] --> B["Understand Core Concepts"]
    B --> C["Study Key Principles"]
    C --> D["Practice with Examples"]
    D --> E{"Self-Assessment"}
    E -- "Need Review" --> C
    E -- "Confident" --> F["Apply to Real Problems"]
    F --> G["Deep Understanding Achieved ✓"]
    style G fill:#22c55e,color:#fff
    style A fill:#6366f1,color:#fff`;
}

function generateGenericRoadmap(topic: string): string {
  return [
    `### Foundation & Prerequisites | Begin by reviewing fundamental concepts that ${topic} builds upon. Gather resources and set up your study environment. | 2-3 days ###`,
    `### Core Concept Mastery | Deep dive into the primary principles of ${topic}. Focus on understanding 'why' not just 'what'. Use active recall and spaced repetition. | 1 week ###`,
    `### Practice & Application | Work through practical exercises and real-world examples. Apply concepts to solve progressively harder problems. | 1-2 weeks ###`,
    `### Advanced Topics | Explore specialized areas and edge cases within ${topic}. Connect concepts across different domains. | 1 week ###`,
    `### Review & Consolidation | Revisit weak areas identified during practice. Create summary notes and teach concepts to solidify understanding. | 3-5 days ###`,
    `### Assessment & Mastery | Take practice tests and work through comprehensive problems. Identify remaining gaps and do targeted review. | 2-3 days ###`
  ].join("\n");
}

function generateGenericPodcast(topic: string, mood: string): string {
  const tone = mood === "funny" ? "lighthearted and humorous" : mood === "strict" ? "serious and focused" : "energetic and engaging";
  return `**Host A:** Welcome back to another episode! Today we're diving deep into ${topic}. I'm really excited about this one.

**Host B:** Me too! ${topic} is one of those areas that seems complex at first, but once you get the fundamentals, it all clicks into place.

**Host A:** Exactly. So let's start with the basics. What IS ${topic} at its core?

**Host B:** Great question. At its foundation, ${topic} is about understanding key principles and how they interact. Think of it like learning a new language — you start with vocabulary (the core concepts), then grammar (the rules and relationships), then you start having conversations (applications).

**Host A:** That's a brilliant analogy. So what are those "vocabulary words" — the fundamental concepts people need to know first?

**Host B:** There are really three pillars. First, you need to understand the foundational theory — why things work the way they do. Second, you need to grasp the practical methods — how to actually apply these concepts. And third, you need context — where and when to use which approach.

**Host A:** Let's break down each of those. Starting with the theory...

**Host B:** The theoretical framework of ${topic} gives us a structured way to think about problems. Without it, we're just guessing. It's like having a map before you start a road trip — you CAN drive without one, but you'll waste a lot of time and fuel.

**Host A:** And the practical side?

**Host B:** This is where it gets fun! Practice is where theory meets reality. The best way to learn ${topic} is by doing — working through examples, making mistakes, and iterating. Every expert I know says the same thing: the learning happens in the doing.

**Host A:** For our listeners who are just starting out with ${topic}, what's your number one piece of advice?

**Host B:** Don't try to learn everything at once. Start with one core concept, understand it deeply, then build from there. ${topic} is a building — you can't put up the roof before the walls are standing.

**Host A:** Love it. And for those who are already intermediate?

**Host B:** Challenge yourself! Find edge cases, try teaching it to someone else, and look for connections to other fields. That's when ${topic} really starts to come alive.

**Host A:** This has been incredibly insightful. Thanks for breaking ${topic} down so clearly!

**Host B:** My pleasure! Remember, learning is a journey, not a destination. Keep exploring, keep questioning, and most importantly — keep practicing!

**Host A:** That's all for today. Until next time, keep learning and stay curious!`;
}

function generateGenericReel(topic: string, mood: string): string {
  const hook = mood === "funny"
    ? "This topic looks scary, but it is mostly wearing a fake mustache."
    : mood === "strict"
      ? "No fluff. We define it, test it, and use it."
      : "This is one of those ideas that clicks fast with the right example.";

  return [
    `A: ${hook}`,
    `B: So what is ${topic} in one clean sentence?`,
    `A: It is the core idea, rule, or system that helps us solve a real problem.`,
    `B: That sounds broad. Give me the student version.`,
    `A: First learn what it controls, then learn the steps, then try one example.`,
    `B: What mistake do beginners usually make?`,
    `A: They memorize words before they understand the job each part is doing.`,
    `B: So the trick is to ask why each part exists.`,
    `A: Exactly. Once the why is clear, the how becomes much easier.`,
    `B: Quick test: if I can teach it back with an example, I probably get it.`,
    `A: Perfect. That is active recall, and it beats rereading every time.`,
    `B: Save this, replay it, then explain ${topic} without looking.`
  ].join("\n");
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PUBLIC API
   ═══════════════════════════════════════════════════════════════════ */

export interface GenerateOptions {
  topic: string;
  activeTab: "learn" | "quiz" | "visualize" | "plan";
  learnFormat: string;
  quizFormat: string;
  vizFormat: string;
  mood: string;
  timeAvailable: string;
  learningStyle: string;
  eduLevel: string;
  grade?: string;
  collegeYear?: string;
  major?: string;
  goal?: string;
  experienceLevel?: string;
  profileContext?: string;
  quizDifficulty?: string;
}

export interface GenerateResult {
  content: string;
  suggestions: string[];
}

export function generateContent(opts: GenerateOptions): GenerateResult {
  const kb = findKnowledge(opts.topic);
  let content = "";
  let suggestions: string[] = [];

  if (opts.activeTab === "learn") {
    if (opts.learnFormat === "flashcards") {
      content = kb ? generateKBFlashcards(kb) : generateGenericFlashcards(opts.topic);
    } else if (opts.learnFormat === "reel") {
      content = kb ? generateKBReel(kb, opts.mood) : generateGenericReel(opts.topic, opts.mood);
    } else if (opts.learnFormat === "podcast") {
      content = kb ? generateKBPodcast(kb, opts.mood) : generateGenericPodcast(opts.topic, opts.mood);
    } else {
      // lecture
      content = kb
        ? generateKBLecture(kb, opts.learningStyle, opts.mood, opts.timeAvailable, opts.eduLevel, opts.grade, opts.goal, opts.experienceLevel, opts.profileContext)
        : generateGenericLecture(opts.topic, opts.learningStyle, opts.mood, opts.timeAvailable, opts.eduLevel, opts.goal, opts.experienceLevel, opts.profileContext);
    }
  } else if (opts.activeTab === "quiz") {
    if (opts.quizFormat === "mcq") {
      content = kb ? generateKBMCQ(kb, opts.quizDifficulty) : generateGenericMCQ(opts.topic, opts.quizDifficulty);
    } else {
      content = kb ? generateKBRapid(kb) : generateGenericRapid(opts.topic);
    }
  } else if (opts.activeTab === "visualize") {
    content = kb
      ? (opts.vizFormat === "dld" ? kb.mermaidDLD : kb.mermaidFlow)
      : generateGenericMermaid(opts.topic, opts.vizFormat);
  } else if (opts.activeTab === "plan") {
    content = kb ? generateKBRoadmap(kb) : generateGenericRoadmap(opts.topic);
  }

  // Generate suggestions
  suggestions = kb
    ? kb.relatedTopics.slice(0, 3)
    : [`${opts.topic} advanced concepts`, `${opts.topic} practice problems`, `${opts.topic} real-world applications`];

  return { content, suggestions };
}

export function generateFollowUp(question: string, originalTopic: string): string {
  const kb = findKnowledge(question) || findKnowledge(originalTopic);
  if (kb) {
    // Check if question matches any definition
    const lower = question.toLowerCase();
    for (const [term, def] of Object.entries(kb.definitions)) {
      if (lower.includes(term.toLowerCase())) {
        return `## ${term}\n\n${def}\n\n---\n\n> This is a key concept within **${kb.title}**. Understanding this will strengthen your grasp of the entire topic.\n\n* **Why it matters**: ${term} is foundational to many advanced concepts\n* **How to remember it**: Connect it to something you already understand\n* **Next step**: Try explaining ${term} in your own words`;
      }
    }
    // General follow-up
    return `## More on: ${question}\n\nGreat question! Let's dig deeper.\n\n${kb.summary}\n\n---\n\n## Key Points to Consider\n\n${kb.keyPoints.map(p => `* **${p}**`).join("\n")}\n\n---\n\n## Think About It\n\n${kb.analogies[0] || `Consider how ${question} connects to the bigger picture of ${kb.title}.`}`;
  }

  return `## Exploring: ${question}\n\nThat's a great follow-up question! Let me break it down.\n\n${question} connects to several important concepts:\n\n* **Core idea**: Understanding the fundamental principle behind this question\n* **Context**: How this fits into the broader topic of ${originalTopic}\n* **Application**: Where you might encounter this in practice\n\n---\n\n> 💡 **Tip**: The best way to deepen your understanding is to try explaining the concept in your own words, then check your explanation against the source material.\n\n## Next Steps\n\n* Review the foundational concepts of ${originalTopic}\n* Practice with specific examples\n* Try connecting this to real-world scenarios`;
}

/* ═══════════════════════════════════════════════════════════════════
   KB-BASED GENERATORS (use pre-built knowledge)
   ═══════════════════════════════════════════════════════════════════ */

function generateKBLecture(kb: TopicKnowledge, style: string, mood: string, time: string, eduLevel: string, grade?: string, goal = "concept", experience = "beginner", profileContext = "general learning"): string {
  const length = getContentLength(time);
  const sections: string[] = [];

  // Introduction
  sections.push(`## ${kb.title}\n\n${kb.summary}`);

  // Definitions
  const defs = Object.entries(kb.definitions);
  const defCount = length === "short" ? 2 : length === "medium" ? 4 : defs.length;
  sections.push("---\n\n## Key Definitions\n\n" + defs.slice(0, defCount).map(([term, def]) =>
    `> **${term}**: ${def}`
  ).join("\n\n"));

  // Key Points
  const pointCount = length === "short" ? 3 : kb.keyPoints.length;
  sections.push("---\n\n## Key Concepts\n\n" + kb.keyPoints.slice(0, pointCount).map(p => `* ${p}`).join("\n"));

  // Style-specific content
  if (style === "visual") {
    sections.push("---\n\n## Visual Framework\n\n" + kb.keyPoints.slice(0, 3).map((p, i) =>
      `${["🔵", "🟢", "🟡"][i]} **${p}**`
    ).join("\n\n"));
  } else if (style === "socratic") {
    sections.push("---\n\n## Think About These Questions\n\n" +
      `* Why is ${kb.title} important in the real world?\n` +
      `* What would happen if the core principles didn't exist?\n` +
      `* Can you think of an analogy from everyday life?\n` +
      `* How does ${kb.title} connect to other areas you've studied?`
    );
  } else if (style === "analogical") {
    sections.push("---\n\n## Understanding Through Analogy\n\n" +
      kb.analogies.map(a => `> ${a}`).join("\n\n")
    );
  }

  // Examples
  if (length !== "short") {
    sections.push("---\n\n## Examples\n\n" + kb.examples.map(e => `* ${e}`).join("\n"));
  }

  // Formulas (if any)
  if (kb.formulas && length !== "short") {
    sections.push("---\n\n## Key Formulas\n\n" + kb.formulas.map(f => `* **${f}**`).join("\n"));
  }

  // Fun facts for long content
  if (length === "long") {
    sections.push("---\n\n## Did You Know? 🧠\n\n" + kb.funFacts.map(f => `* ${f}`).join("\n"));
  }

  let result = sections.join("\n\n");
  result = adjustForEduLevel(result, eduLevel, grade);
  result = applyProfileFrame(result, goal, experience, profileContext, style);
  result = applyAdaptiveTone(result, mood);
  return result;
}

function generateKBFlashcards(kb: TopicKnowledge): string {
  return kb.flashcardPairs.map(pair =>
    `## ${pair.front}\n\n${pair.back}`
  ).join("\n\n---\n\n");
}

function generateKBPodcast(kb: TopicKnowledge, mood: string): string {
  const points = kb.keyPoints;
  const analogies = kb.analogies;
  const facts = kb.funFacts;

  return `**Host A:** Welcome back! Today's deep dive is all about ${kb.title}. I'm fired up about this one!

**Host B:** Same here! ${kb.title} is such a fundamental topic. Let's break it down from scratch.

**Host A:** Perfect. So give us the 30-second elevator pitch — what IS ${kb.title}?

**Host B:** ${kb.summary}

**Host A:** Wow, that's comprehensive. Let's unpack the key concepts one by one.

**Host B:** Absolutely. The first thing to understand is: ${points[0]}. This is the foundation everything else builds on.

**Host A:** And why does that matter practically?

**Host B:** Great question! ${analogies[0] || `Because without this foundation, none of the advanced concepts would make sense.`}

**Host A:** Let's talk about the next major concept.

**Host B:** Right — ${points[1]}. This is where things get really interesting. ${points[2] || ''}

**Host A:** Can you give us a real-world example?

**Host B:** Sure! ${kb.examples[0]}. You can see how this directly connects to what we just discussed.

**Host A:** That makes so much sense. Here's something I love — ${facts[0] || `there are so many fascinating aspects to ${kb.title}`}

**Host B:** Ha, that's incredible! Here's another one: ${facts[1] || 'the history behind this topic is full of surprising turns'}

**Host A:** For our listeners who are studying this for exams or assignments, what are the absolute must-know concepts?

**Host B:** I'd say focus on these key areas:
${points.slice(0, 4).map((p, i) => `${i + 1}. ${p}`).join('\n')}

**Host A:** Golden advice right there. And for the definitions?

**Host B:** Yes! Make sure you can clearly explain:
${Object.entries(kb.definitions).slice(0, 3).map(([term, def]) => `- **${term}**: ${def}`).join('\n')}

**Host A:** This has been an amazing breakdown. Last question — what should listeners study next after mastering ${kb.title}?

**Host B:** I'd recommend looking into ${kb.relatedTopics.slice(0, 3).join(', ')}. They all build on what we discussed today.

**Host A:** Brilliant! Thanks for another incredible episode. Listeners, keep learning, keep growing!

**Host B:** And remember — understanding beats memorizing every single time. Until next time!`;
}

function generateKBReel(kb: TopicKnowledge, mood: string): string {
  const points = kb.keyPoints;
  const defs = Object.entries(kb.definitions);
  const example = kb.examples[0] || points[0];
  const analogy = kb.analogies[0] || `Think of ${kb.title} as a tool that turns confusion into a repeatable process.`;
  const punch = mood === "funny"
    ? "So the idea is not hard, it just likes dramatic entrances."
    : mood === "strict"
      ? "Clean definition, clean example, clean recall. That is the target."
      : "Once the example lands, the whole topic starts feeling much smaller.";

  return [
    `A: Quick challenge. Explain ${kb.title} without making it boring.`,
    `B: Easy. Start with the real job it does.`,
    `A: The job is this: ${kb.summary.split(".")[0]}.`,
    `B: Good. What is the first must-know point?`,
    `A: ${points[0]}.`,
    `B: And the mistake students make?`,
    `A: They skip the foundation and jump straight into details.`,
    `B: Give me one example that makes it stick.`,
    `A: ${example}.`,
    `B: Now make it memorable.`,
    `A: ${analogy}`,
    `B: What should I be able to define after this?`,
    `A: ${defs[0] ? `${defs[0][0]} means ${defs[0][1]}` : points[1] || kb.title}.`,
    `B: Final rule?`,
    `A: ${punch}`
  ].join("\n");
}

function generateKBMCQ(kb: TopicKnowledge, difficulty = "basic"): string {
  const base = kb.mcqs.map((q, index) =>
    `### Q: ${q.q} | A) ${q.a} | B) ${q.b} | C) ${q.c} | D) ${q.d} | Correct: ${q.correct} | Area: ${["Definitions", "Core Concepts", "Technical Details", "Application", "Misconceptions"][index % 5]} ###`
  );
  const defs = Object.entries(kb.definitions).slice(0, 3).map(([term, def], index) =>
    `### Q: Which statement best explains ${term}? | A) ${def} | B) An unrelated detail with no learning value | C) A memorized label without meaning | D) A random example only | Correct: A | Area: Definitions ###`
  );
  const advanced = [
    `### Q: A learner understands ${kb.title} deeply when they can: | A) Recite one phrase | B) Explain tradeoffs, examples, and common mistakes | C) Avoid applying it | D) Only identify the title | Correct: B | Area: Advanced Reasoning ###`,
    `### Q: In a tricky ${kb.title} question, what should you inspect first? | A) Surface keywords only | B) The underlying constraint or rule being tested | C) The longest answer | D) The easiest-looking option | Correct: B | Area: Edge Cases ###`
  ];
  const basic = [
    `### Q: What is the safest way to start learning ${kb.title}? | A) Define the core terms | B) Skip to the hardest example | C) Ignore mistakes | D) Memorize unrelated facts | Correct: A | Area: Foundations ###`,
    `### Q: Which habit improves recall for ${kb.title}? | A) Teaching one example aloud | B) Passive rereading only | C) Avoiding quizzes | D) Copying without thinking | Correct: A | Area: Recall ###`
  ];
  return [...base, ...defs, ...(difficulty === "advanced" ? advanced : basic)].slice(0, 10).join("\n");
}

function generateKBRapid(kb: TopicKnowledge): string {
  return kb.rapidFire.map(q =>
    `### Q: ${q.q} | A: ${q.a} ###`
  ).join("\n");
}

function generateKBRoadmap(kb: TopicKnowledge): string {
  const points = kb.keyPoints;
  return [
    `### Prerequisites & Setup | Review foundational concepts needed to understand ${kb.title}. ${kb.definitions ? `Make sure you know: ${Object.keys(kb.definitions).slice(0, 2).join(', ')}` : ''} | 1-2 days ###`,
    `### Core Theory | ${points[0]}. ${points[1] || ''} Focus on deeply understanding WHY, not just memorizing WHAT. | 3-5 days ###`,
    `### Practical Examples | Work through real examples: ${kb.examples[0]}. Apply theory to concrete scenarios. | 1 week ###`,
    `### Practice & Self-Testing | Test yourself with MCQs and rapid-fire questions. ${kb.analogies[0] ? `Use analogies to reinforce: ${kb.analogies[0]}` : ''} | 4-5 days ###`,
    `### Advanced Connections | Explore how ${kb.title} connects to ${kb.relatedTopics.slice(0, 2).join(' and ')}. Build a bigger-picture understanding. | 3-4 days ###`,
    `### Review & Mastery | Consolidate everything. Create your own summary notes, teach it to someone else, and take practice assessments. | 2-3 days ###`
  ].join("\n");
}

/* ═══════════════════════════════════════════════════════════════════
   SUGGESTED TOPIC CHIPS (for the empty state)
   ═══════════════════════════════════════════════════════════════════ */

export const SUGGESTED_TOPICS = [
  { emoji: "🔍", label: "Binary Search", topic: "binary search" },
  { emoji: "📊", label: "Sorting Algorithms", topic: "sorting algorithms" },
  { emoji: "🧬", label: "Photosynthesis", topic: "photosynthesis" },
  { emoji: "🎯", label: "OOP Concepts", topic: "object oriented programming" },
  { emoji: "🍎", label: "Newton's Laws", topic: "newton's laws" },
  { emoji: "🌍", label: "World War 2", topic: "world war 2" },
];
