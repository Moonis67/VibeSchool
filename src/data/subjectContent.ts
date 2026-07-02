import { Calculator, FlaskConical, Globe, Cpu, Palette, HeartPulse, Code, Music } from "lucide-react";

// 1. Define the Subject List
export const SUBJECTS_LIST = [
  { id: "math", name: "Mathematics", icon: Calculator },
  { id: "science", name: "Physics", icon: FlaskConical },
  { id: "history", name: "History", icon: Globe },
  { id: "tech", name: "Computer Science", icon: Cpu },
  { id: "arts", name: "Arts & Humanities", icon: Palette },
  { id: "bio", name: "Biology", icon: HeartPulse },
];

// 2. The Massive Content Database
export const SUBJECT_CONTENT: any = {
  // --- MATHEMATICS ---
  "math": {
    title: "Mastering Mathematics",
    description: "From basic arithmetic to advanced calculus, explore the language of the universe.",
    videos: [
      { title: "The Map of Mathematics", url: "https://www.youtube.com/watch?v=OmJ-4B-mS-Y", channel: "Domain of Science", views: "12M views" },
      { title: "Calculus: The Essence", url: "https://www.youtube.com/watch?v=WUvTyaaNkzM", channel: "3Blue1Brown", views: "9M views" },
      { title: "Algebra Basics", url: "https://www.youtube.com/watch?v=NybHckSEQBI", channel: "Math Antics", views: "5M views" }
    ],
    topics: [
      { title: "Order of Operations (PEMDAS)", content: "The sequence to solve expressions: Parentheses, Exponents, Multiplication, Division, Addition, Subtraction.", questions: [{ q: "Solve 2 + 3 * 4", options: ["14", "20", "10"], ans: "14" }, { q: "What comes first?", options: ["Add", "Divide", "Subtract"], ans: "Divide" }] },
      { title: "Linear Equations", content: "Finding the value of unknown variables in simple equations like y = mx + b.", questions: [{ q: "Solve for x: 2x + 4 = 10", options: ["3", "2", "4"], ans: "3" }] },
      { title: "Quadratic Formula", content: "A formula used to solve quadratic equations: ax² + bx + c = 0.", questions: [{ q: "Roots of x² - 4 = 0", options: ["2, -2", "4, -4", "2, 0"], ans: "2, -2" }] },
      { title: "Pythagorean Theorem", content: "a² + b² = c². Relates the sides of a right-angled triangle.", questions: [{ q: "Hypotenuse of 3-4-?", options: ["5", "6", "7"], ans: "5" }] },
      { title: "Basic Trigonometry", content: "Sine, Cosine, and Tangent ratios in right triangles.", questions: [{ q: "Sin(30) is?", options: ["0.5", "1", "0"], ans: "0.5" }] },
      { title: "Circle Geometry", content: "Understanding radius, diameter, circumference (2πr), and area (πr²).", questions: [{ q: "Area if r=1?", options: ["π", "2π", "1"], ans: "π" }] },
      { title: "Logarithms", content: "The inverse operation to exponentiation. log_b(x) = y.", questions: [{ q: "Solve log_10(100)", options: ["2", "10", "100"], ans: "2" }] },
      { title: "Derivatives (Calculus I)", content: "Measuring the instantaneous rate of change (slope) of a curve.", questions: [{ q: "Derivative of x²?", options: ["2x", "x", "2"], ans: "2x" }] },
      { title: "Integrals (Calculus I)", content: "Finding the area under a curve; the reverse of a derivative.", questions: [{ q: "Integral of 2x?", options: ["x²", "2x²", "x"], ans: "x²" }] },
      { title: "Probability Basics", content: "Calculating the likelihood of events occurring.", questions: [{ q: "Prob of Heads?", options: ["50%", "25%", "100%"], ans: "50%" }] },
      { title: "Mean, Median, Mode", content: "Measures of central tendency in a dataset.", questions: [{ q: "Mean of 2, 4, 6?", options: ["4", "2", "6"], ans: "4" }] },
      { title: "Standard Deviation", content: "Measuring the amount of variation or dispersion in a set of values.", questions: [{ q: "Symbol for SD?", options: ["σ", "μ", "π"], ans: "σ" }] },
      { title: "Matrices", content: "Rectangular arrays of numbers used to solve linear systems.", questions: [{ q: "Identity Matrix Diagonal?", options: ["1s", "0s", "Mixed"], ans: "1s" }] },
      { title: "Complex Numbers", content: "Numbers involving the imaginary unit i, where i² = -1.", questions: [{ q: "Value of i^2?", options: ["-1", "1", "0"], ans: "-1" }] },
      { title: "Vectors", content: "Quantities having both magnitude and direction.", questions: [{ q: "Do scalars have direction?", options: ["No", "Yes", "Sometimes"], ans: "No" }] },
      { title: "Limits", content: "The value that a function approaches as the input approaches some value.", questions: [{ q: "Limit 1/x as x->inf?", options: ["0", "Infinity", "1"], ans: "0" }] },
      { title: "Set Theory", content: "Logic involving collections of objects (Unions, Intersections).", questions: [{ q: "Union symbol?", options: ["U", "n", "E"], ans: "U" }] },
      { title: "Factorials & Permutations", content: "Counting arrangements. n! = n * (n-1) * ... * 1.", questions: [{ q: "5! equals?", options: ["120", "100", "25"], ans: "120" }] },
      { title: "Prime Numbers", content: "Numbers divisible only by 1 and themselves.", questions: [{ q: "Is 2 prime?", options: ["Yes", "No", "Maybe"], ans: "Yes" }] },
      { title: "Sequences & Series", content: "Arithmetic and Geometric patterns of numbers.", questions: [{ q: "Next in 2, 4, 8?", options: ["16", "10", "12"], ans: "16" }] },
      { title: "Graph Theory", content: "Study of graphs, which are mathematical structures used to model pairwise relations.", questions: [{ q: "Connecting line is?", options: ["Edge", "Vertex", "Node"], ans: "Edge" }] },
      { title: "Differential Equations", content: "Equations involving functions and their derivatives.", questions: [{ q: "ODE involves?", options: ["Derivatives", "Integrals only", "Algebra only"], ans: "Derivatives" }] },
      { title: "Polar Coordinates", content: "Defining points by distance and angle (r, θ).", questions: [{ q: "Polar origin is?", options: ["Pole", "Center", "Axis"], ans: "Pole" }] },
      { title: "Conic Sections", content: "Curves formed by intersecting a cone and plane.", questions: [{ q: "Circle eccentricity?", options: ["0", "1", "Greater than 1"], ans: "0" }] },
      { title: "Hyperbolic Functions", content: "Analogs of trig functions defined for a hyperbola.", questions: [{ q: "sinh(0)?", options: ["0", "1", "-1"], ans: "0" }] },
      { title: "Binomial Theorem", content: "Expanding powers of binomials like (x+y)ⁿ.", questions: [{ q: "Relates to?", options: ["Pascal's Triangle", "Pythagoras", "Euler"], ans: "Pascal's Triangle" }] },
      { title: "Logic & Proofs", content: "Mathematical logic, implications, and methods of proof.", questions: [{ q: "If P then Q is?", options: ["Implication", "Negation", "Union"], ans: "Implication" }] },
      { title: "Numerical Analysis", content: "Algorithms for obtaining numerical solutions.", questions: [{ q: "Newton's Method finds?", options: ["Roots", "Integrals", "Derivatives"], ans: "Roots" }] },
      { title: "Game Theory", content: "Mathematical models of strategic interaction.", questions: [{ q: "Famous Dilemma?", options: ["Prisoner's", "Farmer's", "King's"], ans: "Prisoner's" }] },
      { title: "Topology", content: "Properties of space preserved under continuous deformation.", questions: [{ q: "Coffee mug equals?", options: ["Donut", "Sphere", "Cube"], ans: "Donut" }] }
    ]
  },

  // --- PHYSICS (ID: science) ---
  "science": {
    title: "Physics & The Universe",
    description: "Understand the fundamental laws governing matter, energy, and spacetime.",
    videos: [
      { title: "Physics in 6 Minutes", url: "https://www.youtube.com/watch?v=fFsmY99688o", channel: "Arcanum", views: "1.2M views" },
      { title: "Newton's Laws of Motion", url: "https://www.youtube.com/watch?v=kKKM8Y-u7ds", channel: "Professor Dave", views: "3M views" },
      { title: "Quantum Physics for 7 Year Olds", url: "https://www.youtube.com/watch?v=ARWBdfWpDjc", channel: "DS", views: "5M views" }
    ],
    topics: [
      { title: "Kinematics 1D", content: "Motion in a straight line: Displacement, Velocity, Acceleration.", questions: [{ q: "Change in velocity is?", options: ["Acceleration", "Speed", "Jerk"], ans: "Acceleration" }] },
      { title: "Newton's Laws of Motion", content: "1. Inertia, 2. F=ma, 3. Action-Reaction.", questions: [{ q: "F = ?", options: ["ma", "mv", "mg"], ans: "ma" }] },
      { title: "Projectile Motion", content: "Motion in 2D under gravity (parabolic paths).", questions: [{ q: "Path shape?", options: ["Parabola", "Circle", "Line"], ans: "Parabola" }] },
      { title: "Friction", content: "Resistive forces: Static vs Kinetic friction.", questions: [{ q: "Static vs Kinetic?", options: ["Static > Kinetic", "Kinetic > Static", "Equal"], ans: "Static > Kinetic" }] },
      { title: "Work & Energy", content: "Work = Force x Distance. Conservation of Energy.", questions: [{ q: "Unit of Work?", options: ["Joule", "Watt", "Newton"], ans: "Joule" }] },
      { title: "Power", content: "Rate of doing work. P = W/t.", questions: [{ q: "Unit of Power?", options: ["Watt", "Joule", "Volt"], ans: "Watt" }] },
      { title: "Momentum & Impulse", content: "Mass in motion. p = mv. Conservation of momentum in collisions.", questions: [{ q: "Is momentum a vector?", options: ["Yes", "No", "Depends"], ans: "Yes" }] },
      { title: "Circular Motion", content: "Motion in a circle. Centripetal force and acceleration.", questions: [{ q: "Force direction?", options: ["Center", "Outward", "Tangent"], ans: "Center" }] },
      { title: "Gravitation", content: "Newton's Universal Law: F = G(m1m2)/r².", questions: [{ q: "If mass doubles, Force?", options: ["Doubles", "Halves", "Same"], ans: "Doubles" }] },
      { title: "Fluid Statics", content: "Density, Pressure, Pascal's Principle, Archimedes' Principle.", questions: [{ q: "Pressure formula?", options: ["F/A", "F*A", "m/V"], ans: "F/A" }] },
      { title: "Fluid Dynamics", content: "Fluids in motion. Bernoulli's Equation.", questions: [{ q: "Faster fluid pressure?", options: ["Lower", "Higher", "Same"], ans: "Lower" }] },
      { title: "Thermodynamics Laws", content: "0th (Equilibrium), 1st (Conservation), 2nd (Entropy), 3rd (Absolute Zero).", questions: [{ q: "Entropy measures?", options: ["Disorder", "Heat", "Speed"], ans: "Disorder" }] },
      { title: "Heat Transfer", content: "Conduction, Convection, Radiation.", questions: [{ q: "Sun heat travels by?", options: ["Radiation", "Conduction", "Convection"], ans: "Radiation" }] },
      { title: "Simple Harmonic Motion", content: "Oscillations like pendulums and springs.", questions: [{ q: "Max velocity at?", options: ["Equilibrium", "Extremes", "Halfway"], ans: "Equilibrium" }] },
      { title: "Waves & Sound", content: "Wavelength, Frequency, Amplitude, Doppler Effect.", questions: [{ q: "Sound needs?", options: ["Medium", "Vacuum", "Light"], ans: "Medium" }] },
      { title: "Optics: Reflection", content: "Law of Reflection. Plane and Spherical mirrors.", questions: [{ q: "Angle i equals?", options: ["Angle r", "90 degrees", "0"], ans: "Angle r" }] },
      { title: "Optics: Refraction", content: "Bending of light. Snell's Law. Lenses.", questions: [{ q: "Straw looks bent because?", options: ["Refraction", "Reflection", "Diffraction"], ans: "Refraction" }] },
      { title: "Electrostatics", content: "Electric Charge, Coulomb's Law, Electric Fields.", questions: [{ q: "Like charges?", options: ["Repel", "Attract", "Spin"], ans: "Repel" }] },
      { title: "Electric Circuits", content: "Ohm's Law (V=IR), Series vs Parallel.", questions: [{ q: "Current in series is?", options: ["Same", "Split", "Zero"], ans: "Same" }] },
      { title: "Magnetism", content: "Magnetic fields, Poles, Electromagnets.", questions: [{ q: "North attracts?", options: ["South", "North", "East"], ans: "South" }] },
      { title: "Electromagnetic Induction", content: "Faraday's Law, Lenz's Law, Generators.", questions: [{ q: "Generators convert?", options: ["Mech to Elec", "Elec to Mech", "Heat to Elec"], ans: "Mech to Elec" }] },
      { title: "AC vs DC", content: "Alternating Current vs Direct Current.", questions: [{ q: "Battery output?", options: ["DC", "AC", "Mixed"], ans: "DC" }] },
      { title: "Quantum Physics Basics", content: "Wave-Particle Duality, Planck's Constant, Photons.", questions: [{ q: "Light is?", options: ["Both", "Wave", "Particle"], ans: "Both" }] },
      { title: "The Atom", content: "Bohr Model, Electrons, Protons, Neutrons.", questions: [{ q: "Electron charge?", options: ["Negative", "Positive", "Neutral"], ans: "Negative" }] },
      { title: "Nuclear Physics", content: "Radioactivity (Alpha, Beta, Gamma), Fission vs Fusion.", questions: [{ q: "Sun uses?", options: ["Fusion", "Fission", "Combustion"], ans: "Fusion" }] },
      { title: "Special Relativity", content: "Einstein's theory. Time dilation, Length contraction, E=mc².", questions: [{ q: "Speed limit?", options: ["Light Speed", "Sound", "Inf"], ans: "Light Speed" }] },
      { title: "Astrophysics", content: "Stars, Galaxies, Black Holes, Big Bang.", questions: [{ q: "Light cannot escape?", options: ["Black Hole", "Sun", "Neutron Star"], ans: "Black Hole" }] },
      { title: "Semiconductors", content: "Diodes, Transistors, Silicon technology.", questions: [{ q: "Basis of chips?", options: ["Transistors", "Resistors", "Capacitors"], ans: "Transistors" }] },
      { title: "Standard Model", content: "Quarks, Leptons, Bosons (Higgs).", questions: [{ q: "Force carrier?", options: ["Boson", "Lepton", "Quark"], ans: "Boson" }] },
      { title: "String Theory", content: "Theoretical framework where particles are 1D strings.", questions: [{ q: "Fundamental unit?", options: ["String", "Point", "Wave"], ans: "String" }] }
    ]
  },

  // --- COMPUTER SCIENCE (ID: tech) ---
  "tech": {
    title: "Computer Science",
    description: "Dive into algorithms, coding, and the systems that power the digital world.",
    videos: [
      { title: "Map of Computer Science", url: "https://www.youtube.com/watch?v=SzJ46YA_RaA", channel: "Domain of Science", views: "6.2M views" },
      { title: "Sort Algorithms Visualized", url: "https://www.youtube.com/watch?v=kPRA0W1kECg", channel: "Geek", views: "15M views" },
      { title: "100 Seconds of Code", url: "https://www.youtube.com/watch?v=SdmL1X2Rjhs", channel: "Fireship", views: "2M views" }
    ],
    topics: [
      { title: "Binary & Data Representation", content: "Bits, Bytes, Hexadecimal, ASCII, Unicode.", questions: [{ q: "Bits in a Byte?", options: ["8", "16", "32"], ans: "8" }] },
      { title: "Boolean Logic", content: "True/False logic. AND, OR, NOT, XOR gates.", questions: [{ q: "True AND False?", options: ["False", "True", "Null"], ans: "False" }] },
      { title: "Computer Architecture", content: "CPU, RAM, ROM, I/O devices, Von Neumann Architecture.", questions: [{ q: "Volatile Memory?", options: ["RAM", "ROM", "HDD"], ans: "RAM" }] },
      { title: "Operating Systems", content: "Kernel, Process Management, File Systems (Windows, Linux, macOS).", questions: [{ q: "Core of OS?", options: ["Kernel", "Shell", "GUI"], ans: "Kernel" }] },
      { title: "Networking Basics (OSI)", content: "IP, TCP/UDP, DNS, HTTP, The 7 Layers.", questions: [{ q: "Layer 3?", options: ["Network", "Transport", "Physical"], ans: "Network" }] },
      { title: "Variables & Data Types", content: "Integers, Strings, Floats, Booleans in programming.", questions: [{ q: "True/False type?", options: ["Boolean", "String", "Int"], ans: "Boolean" }] },
      { title: "Control Structures", content: "If/Else statements, Switch cases, Loops (For, While).", questions: [{ q: "Loop for fixed iterations?", options: ["For", "While", "Do"], ans: "For" }] },
      { title: "Functions & Scope", content: "Reusable code blocks, Parameters, Return values, Local vs Global scope.", questions: [{ q: "Global scope is?", options: ["Everywhere", "Inside function", "Class only"], ans: "Everywhere" }] },
      { title: "Arrays & Lists", content: "Storing collections of data. Indexing.", questions: [{ q: "First index?", options: ["0", "1", "-1"], ans: "0" }] },
      { title: "Basic Sorting Algorithms", content: "Bubble Sort, Selection Sort, Insertion Sort.", questions: [{ q: "Worst case Bubble Sort?", options: ["O(n^2)", "O(n)", "O(log n)"], ans: "O(n^2)" }] },
      { title: "Searching Algorithms", content: "Linear Search vs Binary Search.", questions: [{ q: "Binary search needs?", options: ["Sorted Data", "Any Data", "Hash Map"], ans: "Sorted Data" }] },
      { title: "Recursion", content: "A function calling itself to solve smaller instances of a problem.", questions: [{ q: "Needs what to stop?", options: ["Base Case", "Loop", "Break"], ans: "Base Case" }] },
      { title: "Object-Oriented Programming (OOP)", content: "Classes, Objects, Inheritance, Polymorphism, Encapsulation.", questions: [{ q: "Blueprint for object?", options: ["Class", "Method", "Variable"], ans: "Class" }] },
      { title: "Data Structures: Stacks & Queues", content: "LIFO (Stack) and FIFO (Queue) structures.", questions: [{ q: "LIFO structure?", options: ["Stack", "Queue", "Array"], ans: "Stack" }] },
      { title: "Data Structures: Trees", content: "Binary Trees, BST, Traversal (In-order, Pre-order).", questions: [{ q: "Top node?", options: ["Root", "Leaf", "Branch"], ans: "Root" }] },
      { title: "Hash Tables", content: "Key-Value pairs, Hashing functions, Collisions.", questions: [{ q: "Lookup complexity?", options: ["O(1)", "O(n)", "O(log n)"], ans: "O(1)" }] },
      { title: "Graphs", content: "Nodes (Vertices) and Edges. Directed vs Undirected.", questions: [{ q: "Connecting line?", options: ["Edge", "Node", "Root"], ans: "Edge" }] },
      { title: "Databases (SQL)", content: "Relational DBs, Tables, Primary Keys, Queries (SELECT, JOIN).", questions: [{ q: "Fetch command?", options: ["SELECT", "GET", "FETCH"], ans: "SELECT" }] },
      { title: "NoSQL Databases", content: "Document stores (MongoDB), Key-Value pairs, Scalability.", questions: [{ q: "MongoDB stores?", options: ["Documents", "Tables", "Rows"], ans: "Documents" }] },
      { title: "Web Dev: HTML/CSS", content: "Structure (HTML) and Styling (CSS) of web pages.", questions: [{ q: "CSS handles?", options: ["Style", "Content", "Logic"], ans: "Style" }] },
      { title: "Web Dev: JavaScript", content: "Client-side scripting, DOM manipulation, ES6 features.", questions: [{ q: "JS runs in?", options: ["Browser", "Server", "Both"], ans: "Both" }] },
      { title: "APIs (REST & GraphQL)", content: "Application Programming Interfaces. GET, POST, PUT, DELETE.", questions: [{ q: "Create data?", options: ["POST", "GET", "DELETE"], ans: "POST" }] },
      { title: "Version Control (Git)", content: "Tracking changes, Branching, Merging, GitHub.", questions: [{ q: "Save changes?", options: ["Commit", "Push", "Pull"], ans: "Commit" }] },
      { title: "Software Testing", content: "Unit Testing, Integration Testing, TDD.", questions: [{ q: "Unit test checks?", options: ["Small component", "Whole app", "User flow"], ans: "Small component" }] },
      { title: "Cybersecurity Basics", content: "Encryption, Hashing, Phishing, Firewalls.", questions: [{ q: "Secure protocol?", options: ["HTTPS", "HTTP", "FTP"], ans: "HTTPS" }] },
      { title: "Artificial Intelligence", content: "Machine Learning, Neural Networks, NLP.", questions: [{ q: "AI learning method?", options: ["Neural Net", "If/Else", "Loop"], ans: "Neural Net" }] },
      { title: "Big Data", content: "Volume, Velocity, Variety. Hadoop, Spark.", questions: [{ q: "3 Vs relate to?", options: ["Big Data", "Cloud", "IoT"], ans: "Big Data" }] },
      { title: "Cloud Computing", content: "AWS, Azure, Google Cloud. IaaS, PaaS, SaaS.", questions: [{ q: "Google Drive is?", options: ["SaaS", "IaaS", "PaaS"], ans: "SaaS" }] },
      { title: "Software Development Lifecycle", content: "Waterfall vs Agile methodology. Scrum, Kanban.", questions: [{ q: "Agile uses?", options: ["Sprints", "Phases", "Steps"], ans: "Sprints" }] },
      { title: "Compiler vs Interpreter", content: "Translating code. Compiled (C++) vs Interpreted (Python).", questions: [{ q: "Output of compiler?", options: ["Machine Code", "Source Code", "Comments"], ans: "Machine Code" }] }
    ]
  },

  // --- BIOLOGY (ID: bio) ---
  "bio": {
    title: "Biology & Life",
    description: "Explore the science of life, from microscopic cells to complex ecosystems.",
    videos: [
      { title: "Introduction to Biology", url: "https://www.youtube.com/watch?v=8kK2zwjRV0M", channel: "Amoeba Sisters", views: "3M views" },
      { title: "The Cell Song", url: "https://www.youtube.com/watch?v=rABKB5aS2Zg", channel: "SciTube", views: "10M views" },
      { title: "DNA Replication", url: "https://www.youtube.com/watch?v=TNKWgcFPHqw", channel: "CrashCourse", views: "4M views" }
    ],
    topics: [
      { title: "Characteristics of Life", content: "Cells, Metabolism, Homeostasis, Reproduction, Growth.", questions: [{ q: "Define Homeostasis", options: ["Balance", "Growth", "Energy"], ans: "Balance" }] },
      { title: "Scientific Method", content: "Observation, Hypothesis, Experiment, Analysis, Conclusion.", questions: [{ q: "Educated guess?", options: ["Hypothesis", "Theory", "Law"], ans: "Hypothesis" }] },
      { title: "Chemistry of Life", content: "Atoms, Bonds (Ionic, Covalent, Hydrogen), Water properties.", questions: [{ q: "Water is?", options: ["Polar", "Non-polar", "Ionic"], ans: "Polar" }] },
      { title: "Macromolecules", content: "Carbohydrates, Lipids, Proteins, Nucleic Acids.", questions: [{ q: "Sugar is?", options: ["Carbohydrate", "Lipid", "Protein"], ans: "Carbohydrate" }] },
      { title: "Cell Structure (Prokaryote)", content: "No nucleus, simple structure, Bacteria.", questions: [{ q: "Has nucleus?", options: ["No", "Yes", "Maybe"], ans: "No" }] },
      { title: "Cell Structure (Eukaryote)", content: "Nucleus, Organelles, Plants & Animals.", questions: [{ q: "Has nucleus?", options: ["Yes", "No", "Sometimes"], ans: "Yes" }] },
      { title: "Cell Membrane", content: "Phospholipid bilayer, Transport (Active/Passive).", questions: [{ q: "Function?", options: ["Control entry", "Make energy", "Store DNA"], ans: "Control entry" }] },
      { title: "Organelles", content: "Mitochondria (Powerhouse), Ribosomes (Protein), Chloroplasts.", questions: [{ q: "Powerhouse?", options: ["Mitochondria", "Nucleus", "Golgi"], ans: "Mitochondria" }] },
      { title: "Cellular Respiration", content: "Glycolysis, Krebs Cycle, ETC. ATP production.", questions: [{ q: "Main product?", options: ["ATP", "Sugar", "Oxygen"], ans: "ATP" }] },
      { title: "Photosynthesis", content: "Light dependent reactions, Calvin Cycle. Plants making food.", questions: [{ q: "Product?", options: ["Glucose", "Salt", "Light"], ans: "Glucose" }] },
      { title: "Cell Division: Mitosis", content: "Somatic cells. Prophase, Metaphase, Anaphase, Telophase.", questions: [{ q: "Result?", options: ["2 Identical Cells", "4 Unique Cells", "1 Cell"], ans: "2 Identical Cells" }] },
      { title: "Cell Division: Meiosis", content: "Gametes (Sex cells). Reduction division.", questions: [{ q: "Result?", options: ["4 Unique Cells", "2 Identical", "Clones"], ans: "4 Unique Cells" }] },
      { title: "DNA Structure", content: "Double Helix, Nucleotides (A, T, C, G). Watson & Crick.", questions: [{ q: "Shape?", options: ["Helix", "Circle", "Line"], ans: "Helix" }] },
      { title: "Protein Synthesis", content: "Transcription (DNA->RNA) and Translation (RNA->Protein).", questions: [{ q: "Makes what?", options: ["Protein", "Sugar", "Fat"], ans: "Protein" }] },
      { title: "Genetics: Mendel", content: "Dominant/Recessive traits. Punnett Squares.", questions: [{ q: "Genotype is?", options: ["Genetic Makeup", "Physical Trait", "Mutation"], ans: "Genetic Makeup" }] },
      { title: "Complex Genetics", content: "Codominance, Incomplete Dominance, Sex-linked traits.", questions: [{ q: "Blood type is?", options: ["Codominant", "Simple", "Recessive"], ans: "Codominant" }] },
      { title: "Genetic Mutations", content: "Point mutations, Frameshift, Chromosomal.", questions: [{ q: "Always bad?", options: ["No", "Yes", "Mostly"], ans: "No" }] },
      { title: "Biotechnology", content: "CRISPR, Gel Electrophoresis, Cloning, GMOs.", questions: [{ q: "GMO stands for?", options: ["Genetically Modified", "Green Moss", "Growth Org"], ans: "Genetically Modified" }] },
      { title: "Evolution: Darwin", content: "Natural Selection, Survival of the Fittest, Adaptation.", questions: [{ q: "Proposed by?", options: ["Darwin", "Newton", "Einstein"], ans: "Darwin" }] },
      { title: "Phylogeny & Taxonomy", content: "Classification (Domain, Kingdom... Species). Cladograms.", questions: [{ q: "Broadest group?", options: ["Domain", "Kingdom", "Species"], ans: "Domain" }] },
      { title: "Bacteria & Viruses", content: "Structure, Reproduction, Antibiotics vs Vaccines.", questions: [{ q: "Antibiotics kill?", options: ["Bacteria", "Viruses", "Both"], ans: "Bacteria" }] },
      { title: "Protists & Fungi", content: "Algae, Amoeba, Mushrooms, Yeast, Mold.", questions: [{ q: "Yeast is?", options: ["Fungi", "Plant", "Bacteria"], ans: "Fungi" }] },
      { title: "Plant Biology", content: "Roots, Shoots, Leaves. Xylem/Phloem. Reproduction.", questions: [{ q: "Photosynthesis site?", options: ["Leaf", "Root", "Stem"], ans: "Leaf" }] },
      { title: "Animal Kingdom: Invertebrates", content: "Sponges, Worms, Insects, Mollusks.", questions: [{ q: "Backbone?", options: ["No", "Yes", "Maybe"], ans: "No" }] },
      { title: "Animal Kingdom: Vertebrates", content: "Fish, Amphibians, Reptiles, Birds, Mammals.", questions: [{ q: "Backbone?", options: ["Yes", "No", "Some"], ans: "Yes" }] },
      { title: "Human Systems: Nervous", content: "Brain, Spinal Cord, Neurons, Neurotransmitters.", questions: [{ q: "Signal cell?", options: ["Neuron", "Blood", "Skin"], ans: "Neuron" }] },
      { title: "Human Systems: Circulatory", content: "Heart, Blood vessels, Blood types.", questions: [{ q: "Pump organ?", options: ["Heart", "Lung", "Brain"], ans: "Heart" }] },
      { title: "Human Systems: Immune", content: "White blood cells, Antibodies, Antigens.", questions: [{ q: "Antibodies fight?", options: ["Antigens", "Cells", "Vitamins"], ans: "Antigens" }] },
      { title: "Ecology: Ecosystems", content: "Biotic/Abiotic factors. Food Chains/Webs.", questions: [{ q: "Biotic means?", options: ["Living", "Non-living", "Rock"], ans: "Living" }] },
      { title: "Ecology: Cycles", content: "Water, Carbon, Nitrogen cycles. Climate Change.", questions: [{ q: "Rain is?", options: ["Precipitation", "Evaporation", "Condensation"], ans: "Precipitation" }] }
    ]
  },

  // --- HISTORY (ID: history) ---
  "history": {
    title: "World History",
    description: "Journey through time, from ancient civilizations to the modern era.",
    videos: [
      { title: "History of the Entire World", url: "https://www.youtube.com/watch?v=xuCn8ux2gbs", channel: "Bill Wurtz", views: "150M views" },
      { title: "WWI Oversimplified", url: "https://www.youtube.com/watch?v=dHSQAEam2jc", channel: "OverSimplified", views: "25M views" },
      { title: "Ancient Egypt 101", url: "https://www.youtube.com/watch?v=hO1tzmi1V5g", channel: "NatGeo", views: "5M views" }
    ],
    topics: [
      { title: "Prehistory & Early Humans", content: "Paleolithic (Stone Age), Hunter-Gatherers, Neolithic Revolution (Farming).", questions: [{ q: "First tools?", options: ["Stone", "Iron", "Bronze"], ans: "Stone" }] },
      { title: "Mesopotamia", content: "The Fertile Crescent, Sumerians, Cuneiform, Hammurabi's Code.", questions: [{ q: "First writing?", options: ["Cuneiform", "Latin", "English"], ans: "Cuneiform" }] },
      { title: "Ancient Egypt", content: "Nile River, Pharaohs, Pyramids, Hieroglyphics.", questions: [{ q: "Ruler title?", options: ["Pharaoh", "King", "Emperor"], ans: "Pharaoh" }] },
      { title: "Indus Valley Civilization", content: "Harappa, Mohenjo-Daro, Urban planning.", questions: [{ q: "Known for?", options: ["Urban Planning", "War", "Gold"], ans: "Urban Planning" }] },
      { title: "Ancient China", content: "Dynasties (Shang, Zhou), Mandate of Heaven, Confucianism, Taoism.", questions: [{ q: "Famous Wall?", options: ["Great Wall", "Red Wall", "High Wall"], ans: "Great Wall" }] },
      { title: "Ancient Greece", content: "City-states (Athens vs Sparta), Democracy, Philosophy (Socrates/Plato).", questions: [{ q: "Athens invented?", options: ["Democracy", "Republic", "Empire"], ans: "Democracy" }] },
      { title: "Alexander the Great", content: "Hellenistic Culture, Conquest of Persia.", questions: [{ q: "Tutor?", options: ["Aristotle", "Plato", "Socrates"], ans: "Aristotle" }] },
      { title: "Roman Republic", content: "Senate, Consuls, Punic Wars, Julius Caesar.", questions: [{ q: "Assassinated leader?", options: ["Caesar", "Augustus", "Nero"], ans: "Caesar" }] },
      { title: "Roman Empire", content: "Augustus, Pax Romana, Christianity, Fall of Rome (476 AD).", questions: [{ q: "First Emperor?", options: ["Augustus", "Nero", "Julius"], ans: "Augustus" }] },
      { title: "Byzantine Empire", content: "Constantinople, Justinian's Code, Eastern Orthodox.", questions: [{ q: "Capital?", options: ["Constantinople", "Rome", "Athens"], ans: "Constantinople" }] },
      { title: "Islamic Golden Age", content: "Caliphates, Advances in Math/Science, House of Wisdom.", questions: [{ q: "Invented?", options: ["Algebra", "Calculus", "Physics"], ans: "Algebra" }] },
      { title: "Middle Ages (Europe)", content: "Feudalism, Knights, The Church, Black Death.", questions: [{ q: "Economic system?", options: ["Feudalism", "Capitalism", "Socialism"], ans: "Feudalism" }] },
      { title: "The Crusades", content: "Religious wars between Christians and Muslims for the Holy Land.", questions: [{ q: "Target?", options: ["Holy Land", "Rome", "Paris"], ans: "Holy Land" }] },
      { title: "The Mongols", content: "Genghis Khan, Largest Land Empire, Silk Road safety.", questions: [{ q: "Lifestyle?", options: ["Nomadic", "Urban", "Sea"], ans: "Nomadic" }] },
      { title: "The Renaissance", content: "Rebirth of Art/Learning in Italy. Da Vinci, Michelangelo.", questions: [{ q: "Focus?", options: ["Humanism", "Religion", "War"], ans: "Humanism" }] },
      { title: "The Reformation", content: "Martin Luther, 95 Theses, Protestantism vs Catholicism.", questions: [{ q: "Split from?", options: ["Catholicism", "Islam", "Judaism"], ans: "Catholicism" }] },
      { title: "Age of Exploration", content: "Columbus, Magellan, Columbian Exchange.", questions: [{ q: "Sailed to?", options: ["Americas", "India", "China"], ans: "Americas" }] },
      { title: "Absolute Monarchs", content: "Louis XIV, Divine Right of Kings, Peter the Great.", questions: [{ q: "Nickname?", options: ["Sun King", "Moon King", "Star King"], ans: "Sun King" }] },
      { title: "The Enlightenment", content: "Reason, Science, Locke, Rousseau, Rights of Man.", questions: [{ q: "Focus?", options: ["Logic", "Faith", "Tradition"], ans: "Logic" }] },
      { title: "American Revolution", content: "1776, Independence from Britain, Democracy.", questions: [{ q: "Against?", options: ["Britain", "France", "Spain"], ans: "Britain" }] },
      { title: "French Revolution", content: "1789, Storming of Bastille, Napoleon, Guillotine.", questions: [{ q: "Device used?", options: ["Guillotine", "Sword", "Gun"], ans: "Guillotine" }] },
      { title: "Industrial Revolution", content: "Steam Engine, Factories, Urbanization.", questions: [{ q: "Powered by?", options: ["Steam", "Solar", "Wind"], ans: "Steam" }] },
      { title: "Imperialism", content: "Scramble for Africa, British Raj, Opium Wars.", questions: [{ q: "Scramble for?", options: ["Africa", "Europe", "USA"], ans: "Africa" }] },
      { title: "World War I", content: "1914-1918. Trenches, Alliances, Treaty of Versailles.", questions: [{ q: "Warfare type?", options: ["Trench", "Air", "Sea"], ans: "Trench" }] },
      { title: "Russian Revolution", content: "1917. Lenin, Bolsheviks, Rise of Communism (USSR).", questions: [{ q: "New system?", options: ["Communism", "Democracy", "Monarchy"], ans: "Communism" }] },
      { title: "The Great Depression", content: "1929 Crash, Global economic downturn.", questions: [{ q: "Event?", options: ["Stock Crash", "War", "Plague"], ans: "Stock Crash" }] },
      { title: "World War II", content: "1939-1945. Axis vs Allies, Holocaust, Atomic Bomb.", questions: [{ q: "Opposing sides?", options: ["Allies/Axis", "North/South", "East/West"], ans: "Allies/Axis" }] },
      { title: "The Cold War", content: "USA vs USSR. Proxy Wars (Korea/Vietnam), Space Race.", questions: [{ q: "Weapon fear?", options: ["Nuclear", "Chemical", "Biological"], ans: "Nuclear" }] },
      { title: "Decolonization", content: "Independence of India (Gandhi), Africa, Asia.", questions: [{ q: "Gandhi led?", options: ["India", "Africa", "China"], ans: "India" }] },
      { title: "Modern Era", content: "Globalization, Internet, Terrorism, Climate Change.", questions: [{ q: "Key Tech?", options: ["Internet", "Steam", "Wheel"], ans: "Internet" }] }
    ]
  },

  // --- ARTS (ID: arts) ---
  "arts": {
    title: "Arts & Culture",
    description: "Appreciate human creativity through painting, sculpture, and design history.",
    videos: [
      { title: "Understanding Color Theory", url: "https://www.youtube.com/watch?v=L1CK9bE3H_s", channel: "Blender Guru", views: "4M views" },
      { title: "Art History in 10 Minutes", url: "https://www.youtube.com/watch?v=rDS4d13fXg8", channel: "SmartHistory", views: "1M views" },
      { title: "Why is Modern Art so Bad?", url: "https://www.youtube.com/watch?v=lNI07egoefc", channel: "PragerU", views: "8M views" }
    ],
    topics: [
      { title: "Elements of Art", content: "Line, Shape, Form, Space, Color, Texture.", questions: [{ q: "Primary color?", options: ["Red", "Green", "Purple"], ans: "Red" }] },
      { title: "Principles of Design", content: "Balance, Contrast, Emphasis, Pattern, Rhythm.", questions: [{ q: "Balance type?", options: ["Symmetrical", "Heavy", "Light"], ans: "Symmetrical" }] },
      { title: "Prehistoric Art", content: "Cave paintings (Lascaux), Venus figurines.", questions: [{ q: "Famous cave?", options: ["Lascaux", "Paris", "Rome"], ans: "Lascaux" }] },
      { title: "Egyptian Art", content: "Hieratic scale, stiffness, focus on afterlife.", questions: [{ q: "Focus?", options: ["Afterlife", "Nature", "War"], ans: "Afterlife" }] },
      { title: "Greek & Roman Art", content: "Idealism, Realism, Columns (Doric, Ionic, Corinthian).", questions: [{ q: "Famous building?", options: ["Parthenon", "Colosseum", "Pyramid"], ans: "Parthenon" }] },
      { title: "Medieval Art", content: "Religious focus, Mosaics, Gothic Architecture (stained glass).", questions: [{ q: "Feature?", options: ["Stained Glass", "Realistic", "Abstract"], ans: "Stained Glass" }] },
      { title: "Renaissance Art", content: "Perspective, Humanism, Da Vinci, Raphael.", questions: [{ q: "Artist?", options: ["Da Vinci", "Van Gogh", "Picasso"], ans: "Da Vinci" }] },
      { title: "Baroque Art", content: "Drama, Motion, Chiaroscuro (Light/Dark contrast).", questions: [{ q: "Contrast technique?", options: ["Chiaroscuro", "Sfumato", "Impasto"], ans: "Chiaroscuro" }] },
      { title: "Rococo", content: "Ornate, pastel colors, playful, aristocratic.", questions: [{ q: "Mood?", options: ["Playful", "Sad", "Angry"], ans: "Playful" }] },
      { title: "Neoclassicism", content: "Return to Greek/Roman order, logic, patriotism.", questions: [{ q: "Inspired by?", options: ["Greece/Rome", "Middle Ages", "Egypt"], ans: "Greece/Rome" }] },
      { title: "Romanticism", content: "Emotion, Nature, Sublime, Anti-Industrial.", questions: [{ q: "Focus?", options: ["Feeling", "Logic", "Math"], ans: "Feeling" }] },
      { title: "Realism", content: "Depicting everyday life accurately. Courbet.", questions: [{ q: "Painted?", options: ["Common People", "Kings", "Gods"], ans: "Common People" }] },
      { title: "Impressionism", content: "Light, Color, Brushstrokes. Monet, Renoir.", questions: [{ q: "Famous artist?", options: ["Monet", "Dali", "Warhol"], ans: "Monet" }] },
      { title: "Post-Impressionism", content: "Van Gogh, Cezanne. Structure + Emotion.", questions: [{ q: "Starry Night?", options: ["Van Gogh", "Monet", "Picasso"], ans: "Van Gogh" }] },
      { title: "Expressionism", content: "Distorting reality to express mood (The Scream).", questions: [{ q: "The Scream?", options: ["Munch", "Dali", "Monet"], ans: "Munch" }] },
      { title: "Cubism", content: "Geometric shapes, multiple viewpoints. Picasso.", questions: [{ q: "Artist?", options: ["Picasso", "Rembrandt", "Bob Ross"], ans: "Picasso" }] },
      { title: "Surrealism", content: "Dreams, Unconscious, Bizarre. Dali.", questions: [{ q: "Famous painting?", options: ["Melting Clocks", "Starry Night", "Scream"], ans: "Melting Clocks" }] },
      { title: "Abstract Expressionism", content: "Action painting, Color Field. Pollock.", questions: [{ q: "Artist?", options: ["Pollock", "Da Vinci", "Monet"], ans: "Pollock" }] },
      { title: "Pop Art", content: "Popular culture, Mass media, Irony. Warhol.", questions: [{ q: "Famous subject?", options: ["Soup Cans", "Flowers", "Ships"], ans: "Soup Cans" }] },
      { title: "Minimalism", content: "Simplicity, Geometry, 'Less is More'.", questions: [{ q: "Motto?", options: ["Less is More", "More is More", "Color is Key"], ans: "Less is More" }] },
      { title: "Contemporary Art", content: "Installations, Digital, Performance, Concept.", questions: [{ q: "Artist?", options: ["Banksy", "Da Vinci", "Michelangelo"], ans: "Banksy" }] },
      { title: "Color Theory", content: "Wheel, Complementary, Analogous, Warm/Cool.", questions: [{ q: "Opposite of Blue?", options: ["Orange", "Red", "Green"], ans: "Orange" }] },
      { title: "Photography", content: "Camera Obscura, Daguerreotype, Digital.", questions: [{ q: "Rule?", options: ["Thirds", "Halves", "Quarters"], ans: "Thirds" }] },
      { title: "Sculpture", content: "Subtractive (Carving) vs Additive (Modeling).", questions: [{ q: "Method?", options: ["Carving", "Painting", "Drawing"], ans: "Carving" }] },
      { title: "Architecture: Basics", content: "Post and Lintel, Arch, Dome, Vault.", questions: [{ q: "Feature?", options: ["Arch", "Wheel", "Engine"], ans: "Arch" }] },
      { title: "Modern Architecture", content: "Skyscrapers, Steel, Glass. Bauhaus.", questions: [{ q: "Material?", options: ["Steel/Glass", "Wood", "Mud"], ans: "Steel/Glass" }] },
      { title: "Graphic Design", content: "Typography, Layout, Branding, Logos.", questions: [{ q: "Font style?", options: ["Serif", "Bold", "Italic"], ans: "Serif" }] },
      { title: "Film History", content: "Silent Era, Talkies, Golden Age, CGI.", questions: [{ q: "Era?", options: ["Silent", "Loud", "Dark"], ans: "Silent" }] },
      { title: "Music Theory Basics", content: "Rhythm, Melody, Harmony, Timbre.", questions: [{ q: "Speed?", options: ["Tempo", "Color", "Shape"], ans: "Tempo" }] },
      { title: "Art Criticism", content: "Description, Analysis, Interpretation, Judgment.", questions: [{ q: "Step 1?", options: ["Description", "Judgment", "Feeling"], ans: "Description" }] }
    ]
  }
};