// Enhanced AI Chatbot - Comprehensive Knowledge Base
// This module handles ANY user query with intelligent responses

function generateEnhancedAIResponse(message, subject, studentData) {
    const lowerMsg = message.toLowerCase();
    const { results, attendance, student } = studentData || {};

    // ========== GREETINGS ==========
    if (lowerMsg.match(/^(hi|hello|hey|good morning|good afternoon|good evening|namaste|hii+)/)) {
        const name = student?.name || 'there';
        return `Hello ${name}! 👋 I'm your AI Study Buddy. I can help you with:\n\n• Academic subjects (CS, Math, Physics, etc.)\n• Study tips and exam preparation\n• Your performance analysis\n• Career guidance\n• College information\n\nWhat would you like to know?`;
    }

    // ========== THANK YOU ==========
    if (lowerMsg.match(/(thank|thanks|appreciate)/)) {
        return "You're welcome! 😊 Feel free to ask me anything else. I'm here to help!";
    }

    // ========== GOODBYE ==========
    if (lowerMsg.match(/^(bye|goodbye|see you|quit|exit)/)) {
        return "Goodbye! 👋 Have a great day! Come back anytime you need help.";
    }

    // ========== DATA STRUCTURES & ALGORITHMS ==========
    if (subject === 'Data Structures' || lowerMsg.match(/(array|linked list|stack|queue|tree|graph|hash|sorting|searching|data structure|algorithm)/)) {
        if (lowerMsg.includes('array')) {
            return "**Arrays** are contiguous memory locations storing elements of same type.\n\n**Advantages:**\n• O(1) random access\n• Cache friendly\n• Simple implementation\n\n**Disadvantages:**\n• Fixed size\n• Costly insertion/deletion\n\n**Common operations:**\n• Access: O(1)\n• Search: O(n)\n• Insert/Delete: O(n)\n\nNeed help with array problems?";
        }
        if (lowerMsg.match(/(linked list)/)) {
            return "**Linked Lists** are linear data structures where elements are stored in nodes.\n\n**Types:**\n• Singly Linked List\n• Doubly Linked List\n• Circular Linked List\n\n**Advantages:**\n• Dynamic size\n• Easy insertion/deletion: O(1)\n\n**Disadvantages:**\n• No random access: O(n)\n• Extra memory for pointers\n\nWould you like code examples?";
        }
        if (lowerMsg.match(/(stack)/)) {
            return "**Stack** is a LIFO (Last In, First Out) data structure.\n\n**Operations:**\n• Push: Add element to top - O(1)\n• Pop: Remove from top - O(1)\n• Peek: View top element - O(1)\n\n**Applications:**\n• Function call stack\n• Expression evaluation\n• Undo operations\n• Browser history\n\nWant to learn about stack implementations?";
        }
        if (lowerMsg.match(/(queue)/)) {
            return "**Queue** is a FIFO (First In, First Out) data structure.\n\n**Types:**\n• Simple Queue\n• Circular Queue\n• Priority Queue\n• Deque (Double-ended)\n\n**Operations:**\n• Enqueue: Add to rear - O(1)\n• Dequeue: Remove from front - O(1)\n\n**Applications:**\n• CPU scheduling\n• Print spooling\n• BFS traversal\n\nNeed more details?";
        }
        if (lowerMsg.match(/(tree|bst|binary)/)) {
            return "**Binary Search Trees (BST)**\n\nA hierarchical data structure where:\n• Left child < Parent\n• Right child > Parent\n\n**Time Complexity:**\n• Search: O(log n) avg, O(n) worst\n• Insert: O(log n) avg\n• Delete: O(log n) avg\n\n**Traversals:**\n1. Inorder (Left-Root-Right)\n2. Preorder (Root-Left-Right)\n3. Postorder (Left-Right-Root)\n\nWant to learn about AVL trees or Red-Black trees?";
        }
        if (lowerMsg.match(/(graph)/)) {
            return "**Graphs** represent relationships between objects.\n\n**Types:**\n• Directed / Undirected\n• Weighted / Unweighted\n• Cyclic / Acyclic\n\n**Representations:**\n• Adjacency Matrix: O(V²) space\n• Adjacency List: O(V+E) space\n\n**Key Algorithms:**\n• BFS - O(V+E)\n• DFS - O(V+E)\n• Dijkstra's - O(V² or V log V)\n• Kruskal's MST\n\nWhich algorithm interests you?";
        }
        if (lowerMsg.match(/(sort|bubble|merge|quick|insertion sort|selection sort)/)) {
            return "**Sorting Algorithms Comparison:**\n\n1. **Bubble Sort**: O(n²) - Simple but slow\n2. **Selection Sort**: O(n²) - Fewer swaps\n3. **Insertion Sort**: O(n²) - Good for small/nearly sorted\n4. **Merge Sort**: O(n log n) - Stable, uses extra space\n5. **Quick Sort**: O(n log n) avg - Fast, in-place\n6. **Heap Sort**: O(n log n) - In-place, not stable\n\n**When to use:**\n• Small data → Insertion sort\n• Large data → Quick sort\n• Stability needed → Merge sort\n\nWhich algorithm would you like to explore?";
        }
        if (lowerMsg.match(/(complexity|big o|time|space)/)) {
            return "**Time Complexity Cheat Sheet:**\n\n• **O(1)** - Constant: Array access\n• **O(log n)** - Logarithmic: Binary search\n• **O(n)** - Linear: Array traversal\n• **O(n log n)** - Linearithmic: Merge sort\n• **O(n²)** - Quadratic: Nested loops\n• **O(2ⁿ)** - Exponential: Recursive fibonacci\n\n**Space Complexity** measures memory usage.\n\nNeed help analyzing a specific algorithm?";
        }
        if (lowerMsg.match(/(search|binary search|linear search)/)) {
            return "**Searching Algorithms:**\n\n**Linear Search:**\n• O(n) time complexity\n• Works on unsorted arrays\n• Simple but slow for large data\n\n**Binary Search:**\n• O(log n) time complexity\n• Requires sorted array\n• Divide and conquer approach\n• Much faster for large datasets\n\n**Hash-based Search:**\n• O(1) average time\n• Uses hash table/map\n\nWant implementation examples?";
        }
        // General DSA
        return "**Data Structures & Algorithms** is fundamental to CS!\n\n**Key Topics:**\n• Arrays, Linked Lists, Stacks, Queues\n• Trees, Graphs, Hash Tables\n• Sorting & Searching algorithms\n• Dynamic Programming\n• Greedy Algorithms\n\nAsk me about any specific topic!";
    }

    // ========== OBJECT-ORIENTED PROGRAMMING ==========
    if (subject === 'OOP' || lowerMsg.match(/(class|object|inheritance|polymorphism|encapsulation|abstraction|oop)/)) {
        if (lowerMsg.match(/(pillar|principle|concept|what is oop)/)) {
            return "**4 Pillars of OOP:**\n\n1. **Encapsulation** 📦\n   - Bundle data + methods\n   - Hide internal details\n   - Use getters/setters\n\n2. **Inheritance** 👨‍👦\n   - Child inherits from parent\n   - Code reusability\n   - IS-A relationship\n\n3. **Polymorphism** 🎭\n   - Same interface, different behavior\n   - Method overloading/overriding\n\n4. **Abstraction** 🎨\n   - Hide complexity\n   - Show only essentials\n\nWhich one would you like to dive deeper into?";
        }
        if (lowerMsg.includes('inheritance')) {
            return "**Inheritance** allows a class to inherit properties from another class.\n\n**Types:**\n• Single: A → B\n• Multilevel: A → B → C\n• Hierarchical: A → B, A → C\n• Multiple: B,C → A (via interfaces)\n\n**Benefits:**\n• Code reusability\n• Method overriding\n• Polymorphism\n\n**Example:** Dog inherits from Animal\n\nNeed a code example?";
        }
        if (lowerMsg.includes('polymorphism')) {
            return "**Polymorphism** means 'many forms'.\n\n**Compile-time (Static):**\n• Method Overloading\n• Operator Overloading\n\n**Runtime (Dynamic):**\n• Method Overriding\n• Virtual functions\n\n**Example:**\n```\nAnimal a = new Dog();\na.speak(); // Outputs: Woof!\n\nAnimal b = new Cat();\nb.speak(); // Outputs: Meow!\n```\n\nWant to learn about abstract classes vs interfaces?";
        }
        if (lowerMsg.includes('encapsulation')) {
            return "**Encapsulation** bundles data and methods together.\n\n**Key Concepts:**\n• Private variables (hidden)\n• Public getter/setter methods\n• Data validation in setters\n• Information hiding\n\n**Benefits:**\n• Data security\n• Controlled access\n• Flexibility to change internal code\n\nNeed a practical example?";
        }
        return "**Object-Oriented Programming** is a paradigm based on objects.\n\n**The 4 Pillars:**\n1. Encapsulation\n2. Inheritance\n3. Polymorphism\n4. Abstraction\n\nAsk about any specific OOP concept!";
    }

    // ========== MATHEMATICS ==========
    if (subject === 'Mathematics' || lowerMsg.match(/(math|calculus|matrix|algebra|probability|statistics|integral|derivative|differential|equation|trigonometry)/)) {
        if (lowerMsg.match(/(calculus|integral|derivative|differentiation|integration)/)) {
            return "**Calculus Fundamentals:**\n\n**Differentiation:**\n• Rate of change of a function\n• d/dx (xⁿ) = n·xⁿ⁻¹\n• Chain rule, Product rule, Quotient rule\n\n**Integration:**\n• Reverse of differentiation\n• ∫xⁿ dx = xⁿ⁺¹/(n+1) + C\n• Definite & Indefinite integrals\n\n**Applications:**\n• Velocity & Acceleration\n• Area under curves\n• Optimization problems\n\nWhich topic do you need help with?";
        }
        if (lowerMsg.match(/(matrix|matrices|linear algebra)/)) {
            return "**Matrices & Linear Algebra:**\n\n**Operations:**\n• Addition/Subtraction\n• Multiplication (A×B ≠ B×A)\n• Transpose, Inverse, Determinant\n\n**Key Concepts:**\n• Eigenvalues & Eigenvectors\n• Rank of a matrix\n• Gaussian elimination\n• System of linear equations\n\n**Applications:**\n• Computer Graphics\n• Machine Learning\n• Network analysis\n\nNeed worked examples?";
        }
        if (lowerMsg.match(/(probability|statistics|mean|median|mode|variance)/)) {
            return "**Probability & Statistics:**\n\n**Probability:**\n• P(A) = Favorable / Total\n• P(A∪B) = P(A) + P(B) - P(A∩B)\n• Bayes' Theorem\n\n**Statistics:**\n• Mean: Average of all values\n• Median: Middle value\n• Mode: Most frequent value\n• Standard Deviation: Spread of data\n\n**Distributions:**\n• Normal, Binomial, Poisson\n\nWhat specific topic interests you?";
        }
        return "**Mathematics** is the foundation of engineering!\n\n**Key Areas:**\n• Calculus (Differentiation, Integration)\n• Linear Algebra (Matrices, Vectors)\n• Probability & Statistics\n• Discrete Mathematics\n• Differential Equations\n\nAsk about any math topic!";
    }

    // ========== PHYSICS ==========
    if (subject === 'Physics' || lowerMsg.match(/(physics|force|energy|motion|wave|electricity|magnetism|quantum|newton|thermodynamics)/)) {
        if (lowerMsg.match(/(newton|force|motion|mechanics)/)) {
            return "**Newton's Laws of Motion:**\n\n**1st Law (Inertia):**\nAn object at rest stays at rest; moving stays moving unless acted upon.\n\n**2nd Law:**\nF = m × a (Force equals mass times acceleration)\n\n**3rd Law:**\nEvery action has an equal and opposite reaction.\n\n**Key Formulas:**\n• v = u + at\n• s = ut + ½at²\n• v² = u² + 2as\n\nNeed problem-solving help?";
        }
        if (lowerMsg.match(/(thermodynamics|heat|temperature|entropy)/)) {
            return "**Thermodynamics:**\n\n**Laws:**\n• 0th Law: Thermal equilibrium\n• 1st Law: Energy conservation (ΔU = Q - W)\n• 2nd Law: Entropy always increases\n• 3rd Law: Absolute zero is unattainable\n\n**Key Concepts:**\n• Heat transfer: Conduction, Convection, Radiation\n• Specific heat capacity\n• Entropy and disorder\n\nWhich area do you want to explore?";
        }
        return "**Physics** - Understanding the universe!\n\n**Key Areas:**\n• Classical Mechanics\n• Thermodynamics\n• Electromagnetism\n• Optics\n• Modern Physics\n\nAsk about any physics topic!";
    }

    // ========== DATABASE & DBMS ==========
    if (lowerMsg.match(/(database|dbms|sql|query|normalization|table|relational|join|select|insert|update|delete from)/)) {
        if (lowerMsg.match(/(normalization|normal form|1nf|2nf|3nf|bcnf)/)) {
            return "**Database Normalization:**\n\n**1NF (First Normal Form):**\n• Atomic values in each cell\n• No repeating groups\n\n**2NF:**\n• Must be in 1NF\n• No partial dependencies\n\n**3NF:**\n• Must be in 2NF\n• No transitive dependencies\n\n**BCNF:**\n• Every determinant is a candidate key\n\n**Purpose:** Reduce redundancy and anomalies.\n\nNeed examples for each form?";
        }
        if (lowerMsg.match(/(sql|query|select|join)/)) {
            return "**SQL Essentials:**\n\n**Basic Queries:**\n• SELECT * FROM table\n• WHERE clause for filtering\n• ORDER BY, GROUP BY\n\n**Joins:**\n• INNER JOIN: Matching rows\n• LEFT JOIN: All left + matching right\n• RIGHT JOIN: All right + matching left\n• FULL JOIN: All rows from both\n\n**Aggregate Functions:**\n• COUNT, SUM, AVG, MIN, MAX\n\nWant to practice SQL queries?";
        }
        return "**Database Management System (DBMS):**\n\n**Key Topics:**\n• ER Diagrams\n• Normalization (1NF, 2NF, 3NF, BCNF)\n• SQL Queries\n• Transactions & ACID properties\n• Indexing & B-trees\n• NoSQL vs SQL\n\nAsk about any DBMS topic!";
    }

    // ========== OPERATING SYSTEMS ==========
    if (lowerMsg.match(/(operating system|os|process|thread|deadlock|scheduling|memory management|paging|semaphore|mutex)/)) {
        if (lowerMsg.match(/(deadlock)/)) {
            return "**Deadlocks in OS:**\n\n**Conditions (all 4 required):**\n1. Mutual Exclusion\n2. Hold and Wait\n3. No Preemption\n4. Circular Wait\n\n**Handling:**\n• Prevention: Remove one condition\n• Avoidance: Banker's algorithm\n• Detection: Resource allocation graph\n• Recovery: Kill process or preempt\n\nNeed more details on any method?";
        }
        if (lowerMsg.match(/(scheduling|fcfs|sjf|round robin|priority)/)) {
            return "**CPU Scheduling Algorithms:**\n\n• **FCFS**: First Come First Served (simple, convoy effect)\n• **SJF**: Shortest Job First (optimal avg wait)\n• **Priority**: Based on priority value\n• **Round Robin**: Time quantum based (fair)\n• **MLFQ**: Multi-Level Feedback Queue\n\n**Metrics:**\n• Turnaround time\n• Waiting time\n• Response time\n• Throughput\n\nWant numerical examples?";
        }
        if (lowerMsg.match(/(process|thread)/)) {
            return "**Processes vs Threads:**\n\n**Process:**\n• Independent program in execution\n• Own memory space\n• Heavy context switching\n• IPC needed for communication\n\n**Thread:**\n• Lightweight process\n• Shared memory space\n• Fast context switching\n• Direct communication\n\n**Thread Types:**\n• User-level threads\n• Kernel-level threads\n\nNeed more details?";
        }
        return "**Operating Systems** manage hardware and software.\n\n**Key Topics:**\n• Process Management\n• CPU Scheduling\n• Memory Management\n• Deadlocks\n• File Systems\n• I/O Management\n\nAsk about any OS concept!";
    }

    // ========== NETWORKING ==========
    if (lowerMsg.match(/(network|tcp|udp|ip|http|osi|protocol|dns|router|switch|ethernet|internet)/)) {
        if (lowerMsg.match(/(osi|layer)/)) {
            return "**OSI Model (7 Layers):**\n\n7. **Application** - HTTP, FTP, SMTP\n6. **Presentation** - Encryption, Compression\n5. **Session** - Session management\n4. **Transport** - TCP, UDP\n3. **Network** - IP, Routing\n2. **Data Link** - MAC, Switching\n1. **Physical** - Cables, Signals\n\n**Remember:** \"All People Seem To Need Data Processing\"\n\nWant details on any specific layer?";
        }
        if (lowerMsg.match(/(tcp|udp)/)) {
            return "**TCP vs UDP:**\n\n**TCP (Transmission Control Protocol):**\n• Connection-oriented\n• Reliable delivery\n• Flow control\n• Used for: HTTP, Email, File transfer\n\n**UDP (User Datagram Protocol):**\n• Connectionless\n• Faster, no guarantee\n• No flow control\n• Used for: Video streaming, Gaming, DNS\n\nNeed more networking concepts?";
        }
        return "**Computer Networking:**\n\n**Key Topics:**\n• OSI & TCP/IP Models\n• IP Addressing & Subnetting\n• Routing & Switching\n• TCP vs UDP\n• DNS, DHCP, NAT\n• Network Security\n\nAsk about any networking topic!";
    }

    // ========== COLLEGE INFO ==========
    if (lowerMsg.match(/(college|campus|library|hostel|fee|canteen|placement|semester|holiday|vacation|timing|contact|office|department head)/)) {
        if (lowerMsg.match(/(library)/)) {
            return "**Library Information:**\n\n📚 **Timings:** Mon-Sat: 8:00 AM - 8:00 PM\n📖 **Books:** 50,000+ titles across all departments\n💻 **Digital:** Access to IEEE, Springer, ACM journals\n🪑 **Seating:** 200+ seats with Wi-Fi\n📋 **Rules:** Max 4 books for 14 days\n\nNeed help finding specific resources?";
        }
        if (lowerMsg.match(/(hostel)/)) {
            return "**Hostel Information:**\n\n🏠 **Boys Hostel:** 3 blocks, 500+ rooms\n🏠 **Girls Hostel:** 2 blocks, 300+ rooms\n⏰ **Timings:** Gate closes at 9:00 PM\n🍽️ **Mess:** Breakfast 7-9 AM, Lunch 12-2 PM, Dinner 7-9 PM\n💰 **Fee:** ₹35,000 per semester\n📶 **Wi-Fi:** Available in all rooms\n\nAny other hostel queries?";
        }
        if (lowerMsg.match(/(fee|payment)/)) {
            return "**Fee Structure:**\n\n💰 **Tuition Fee:** ₹50,000/semester\n🏠 **Hostel Fee:** ₹35,000/semester\n🚌 **Bus Fee:** ₹12,000/semester\n📚 **Library Fee:** ₹2,000/year\n🔬 **Lab Fee:** ₹5,000/semester\n\n**Payment:** Online through student portal\n**Deadline:** Within 30 days of semester start\n\nCheck the Pay Fees section in your portal!";
        }
        return "**College Information:**\n\n🏛️ I can help with:\n• Library timings & resources\n• Hostel details\n• Fee structure\n• Campus facilities\n• Department contacts\n\nWhat would you like to know?";
    }

    // ========== PERFORMANCE & GRADES ==========
    if (lowerMsg.match(/(cgpa|gpa|grade|marks|score|performance|result)/)) {
        if (results && results.length > 0) {
            const cgpa = (results.reduce((sum, r) => sum + r.sgpa, 0) / results.length).toFixed(2);
            const trend = results.length > 1 ?
                (results[results.length - 1].sgpa > results[0].sgpa ? '📈 improving' : '📉 needs attention') : 'stable';
            return `**Your Academic Performance:**\n\n• Current CGPA: **${cgpa}**\n• Trend: ${trend}\n• Semesters completed: ${results.length}\n\n${parseFloat(cgpa) >= 8.5 ? '🌟 Excellent! Keep it up!' :
                parseFloat(cgpa) >= 7.0 ? '👍 Good! Focus on weak subjects to improve.' :
                    '💪 You can do better! Let me help you improve.'}\n\nWant subject-specific tips or study strategies?`;
        }
        return "I don't have your grade data yet. Once you complete a semester, I'll provide detailed performance analysis!";
    }

    // ========== ATTENDANCE ==========
    if (lowerMsg.match(/(attendance|absent|present)/)) {
        if (attendance && attendance.length > 0) {
            const totalDays = attendance.reduce((sum, a) => sum + a.totalDays, 0);
            const presentDays = attendance.reduce((sum, a) => sum + a.presentDays, 0);
            const percentage = ((presentDays / totalDays) * 100).toFixed(1);
            const shortage = 75 - parseFloat(percentage);
            return `**Your Attendance:**\n\n• Current: **${percentage}%**\n• Present: ${presentDays}/${totalDays} days\n\n${parseFloat(percentage) >= 85 ? '🌟 Excellent attendance!' :
                parseFloat(percentage) >= 75 ? '✅ Meeting requirements!' :
                    `⚠️ ${shortage.toFixed(1)}% shortage! Attend all classes.`}\n\n${parseFloat(percentage) < 75 ? `You need ${Math.ceil((75 * totalDays - presentDays * 100) / 25)} more days to reach 75%.` : ''}`;
        }
        return "Attendance tracking will start once you attend classes!";
    }

    // ========== STUDY TIPS & STRATEGIES ==========
    if (lowerMsg.match(/(study|prepare|exam|test|revision|tips|strategy|how to learn)/)) {
        return "**Effective Study Strategies:**\n\n1. **Pomodoro Technique** ⏰\n   25 min focus + 5 min break\n\n2. **Active Recall** 🧠\n   Test yourself, don't just re-read\n\n3. **Spaced Repetition** 📅\n   Review at increasing intervals\n\n4. **Feynman Technique** 📝\n   Explain concepts in simple terms\n\n5. **Practice Problems** 📚\n   Solve previous year papers\n\n6. **Group Study** 👥\n   Discuss with peers\n\n**Exam Prep Checklist:**\n✓ Make summary notes\n✓ Solve past papers\n✓ Identify weak topics\n✓ Sleep well before exam\n\nWhich subject are you preparing for?";
    }

    // ========== CAREER & PLACEMENT ==========
    if (lowerMsg.match(/(career|job|placement|interview|resume|company|internship|salary|package)/)) {
        return "**Career Guidance:**\n\n**For Tech Roles:**\n• Master DSA (LeetCode, HackerRank)\n• Build projects (GitHub portfolio)\n• Learn system design\n• Practice mock interviews\n\n**Top Companies:**\n• FAANG (Facebook, Amazon, Apple, Netflix, Google)\n• Microsoft, Adobe, Salesforce\n• Startups (better learning)\n\n**Resume Tips:**\n✓ Keep it 1-page\n✓ Quantify achievements\n✓ Highlight projects\n✓ Add certifications\n\n**Interview Prep:**\n• Technical: DSA + CS fundamentals\n• Behavioral: STAR method\n• System design: Scalability\n\nNeed specific guidance?";
    }

    // ========== PROGRAMMING LANGUAGES ==========
    if (lowerMsg.match(/(python|java|javascript|c\+\+|coding|programming|html|css|react|node)/)) {
        if (lowerMsg.match(/(python)/)) {
            return "**Python** 🐍\n\n**Why Learn:**\n• Easy syntax, beginner friendly\n• AI/ML, Data Science, Web Dev\n• Huge community & libraries\n\n**Key Concepts:**\n• Variables, Data Types\n• Lists, Tuples, Dictionaries\n• Functions, Classes\n• File Handling\n• NumPy, Pandas, Flask/Django\n\n**Practice:** HackerRank, LeetCode\n\nWant to start with Python basics?";
        }
        if (lowerMsg.match(/(java)/)) {
            return "**Java** ☕\n\n**Why Learn:**\n• Enterprise applications\n• Android development\n• Platform independent (JVM)\n\n**Key Concepts:**\n• OOP (Classes, Objects)\n• Collections Framework\n• Multithreading\n• Exception Handling\n• Spring Boot\n\n**Practice:** CodeChef, LeetCode\n\nNeed help with any Java topic?";
        }
        if (lowerMsg.match(/(javascript|react|node)/)) {
            return "**JavaScript** 🌐\n\n**Why Learn:**\n• Most popular web language\n• Frontend: React, Vue, Angular\n• Backend: Node.js, Express\n• Full-stack development\n\n**Key Concepts:**\n• ES6+ features\n• Async/Await, Promises\n• DOM Manipulation\n• APIs & Fetch\n\nWhich aspect interests you?";
        }
        return "**Programming Language Guide:**\n\n**Python** 🐍 - Easy, AI/ML\n**Java** ☕ - Enterprise, Android\n**C++** ⚡ - Systems, Games\n**JavaScript** 🌐 - Web, Full-stack\n**C** - Embedded, OS\n\n**Learning Path:**\n1. Start with Python (easiest)\n2. Learn DSA\n3. Build projects\n4. Contribute to open source\n\nWhich language are you learning?";
    }

    // ========== WHO ARE YOU ==========
    if (lowerMsg.match(/(who are you|what are you|your name|about you)/)) {
        return "I'm your **AI Study Buddy** 🤖\n\nI'm designed to help students with:\n• 📚 Academic subjects\n• 📊 Performance analysis\n• 🎯 Study strategies\n• 💼 Career guidance\n• 🏛️ College information\n\nI use your academic data to give personalized responses. Ask me anything!";
    }

    // ========== HELP ==========
    if (lowerMsg.match(/(help|what can you do|feature|option)/)) {
        return "**Here's what I can help with:**\n\n📚 **Academics:** DSA, OOP, Math, Physics, DBMS, OS, Networking\n📊 **Your Data:** CGPA, Attendance, Weak subjects\n🎯 **Study:** Tips, Exam prep, Time management\n💼 **Career:** Placements, Interview prep, Resume tips\n🏛️ **College:** Library, Hostel, Fees, Contacts\n💻 **Coding:** Python, Java, JavaScript, C++\n\n**Try asking:**\n• \"What is my CGPA?\"\n• \"Explain binary search trees\"\n• \"How to prepare for exams?\"\n• \"Library timings\"\n• \"Career advice\"";
    }

    // ========== DEFAULT INTELLIGENT RESPONSE ==========
    return `I'm your AI Study Buddy! I can help with:\n\n**📚 Academics:**\n• Data Structures & Algorithms\n• Object-Oriented Programming\n• Mathematics, Physics\n• Database, Operating Systems, Networking\n\n**📊 Your Performance:**\n• CGPA analysis and predictions\n• Attendance tracking\n\n**🎯 Study & Career:**\n• Study strategies and exam tips\n• Career guidance and placements\n\n**🏛️ College Info:**\n• Library, Hostel, Fees\n\nWhat would you like to know?`;
}

module.exports = { generateEnhancedAIResponse };
