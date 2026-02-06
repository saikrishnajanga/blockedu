// Enhanced AI Chatbot - Comprehensive Knowledge Base
// This module handles ANY user query with intelligent responses

function generateEnhancedAIResponse(message, subject, studentData) {
    const lowerMsg = message.toLowerCase();
    const { results, attendance, student } = studentData;

    // ========== GREETINGS ==========
    if (lowerMsg.match(/^(hi|hello|hey|good morning|good afternoon|good evening|namaste)/)) {
        const name = student?.name || 'there';
        return `Hello ${name}! 👋 I'm your AI Study Buddy. I can help you with:\n\n• Academic subjects (CS, Math, Physics, etc.)\n• Study tips and exam preparation\n• Your performance analysis\n• Career guidance\n• General questions\n\nWhat would you like to know?`;
    }

    // ========== THANK YOU ==========
    if (lowerMsg.match(/(thank|thanks|appreciate)/)) {
        return "You're welcome! 😊 Feel free to ask me anything else. I'm here to help!";
    }

    // ========== DATA STRUCTURES & ALGORITHMS ==========
    if (subject === 'Data Structures' || lowerMsg.match(/(array|linked list|stack|queue|tree|graph|hash|sorting|searching)/)) {
        if (lowerMsg.includes('array')) {
            return "**Arrays** are contiguous memory locations storing elements of same type.\n\n**Advantages:**\n• O(1) random access\n• Cache friendly\n• Simple implementation\n\n**Disadvantages:**\n• Fixed size\n• Costly insertion/deletion\n\n**Common operations:**\n• Access: O(1)\n• Search: O(n)\n• Insert/Delete: O(n)\n\nNeed help with array problems?";
        }
        if (lowerMsg.match(/(tree|bst|binary)/)) {
            return "**Binary Search Trees (BST)**\n\nA hierarchical data structure where:\n• Left child < Parent\n• Right child > Parent\n\n**Time Complexity:**\n• Search: O(log n) avg, O(n) worst\n• Insert: O(log n) avg\n• Delete: O(log n) avg\n\n**Traversals:**\n1. Inorder (Left-Root-Right)\n2. Preorder (Root-Left-Right)\n3. Postorder (Left-Right-Root)\n\nWant to learn about AVL trees or Red-Black trees?";
        }
        if (lowerMsg.match(/(sort|bubble|merge|quick)/)) {
            return "**Sorting Algorithms Comparison:**\n\n1. **Bubble Sort**: O(n²) - Simple but slow\n2. **Merge Sort**: O(n log n) - Stable, uses extra space\n3. **Quick Sort**: O(n log n) avg - Fast, in-place\n4. **Heap Sort**: O(n log n) - In-place, not stable\n\n**When to use:**\n• Small data: Insertion sort\n• Large data: Quick sort\n• Stability needed: Merge sort\n\nWhich algorithm would you like to explore?";
        }
        if (lowerMsg.match(/(complexity|big o|time|space)/)) {
            return "**Time Complexity Cheat Sheet:**\n\n• **O(1)** - Constant: Array access\n• **O(log n)** - Logarithmic: Binary search\n• **O(n)** - Linear: Array traversal\n• **O(n log n)** - Linearithmic: Merge sort\n• **O(n²)** - Quadratic: Nested loops\n• **O(2ⁿ)** - Exponential: Recursive fibonacci\n\n**Space Complexity** measures memory usage.\n\nNeed help analyzing a specific algorithm?";
        }
    }

    // ========== OBJECT-ORIENTED PROGRAMMING ==========
    if (subject === 'OOP' || lowerMsg.match(/(class|object|inheritance|polymorphism|encapsulation|abstraction)/)) {
        if (lowerMsg.match(/(pillar|principle|concept)/)) {
            return "**4 Pillars of OOP:**\n\n1. **Encapsulation** 📦\n   - Bundle data + methods\n   - Hide internal details\n   - Use getters/setters\n\n2. **Inheritance** 👨‍👦\n   - Child inherits from parent\n   - Code reusability\n   - IS-A relationship\n\n3. **Polymorphism** 🎭\n   - Same interface, different behavior\n   - Method overloading/overriding\n\n4. **Abstraction** 🎨\n   - Hide complexity\n   - Show only essentials\n\nWhich one would you like to dive deeper into?";
        }
        if (lowerMsg.includes('inheritance')) {
            return "**Inheritance** allows a class to inherit properties from another class.\n\n**Types:**\n• Single: A → B\n• Multilevel: A → B → C\n• Hierarchical: A → B, A → C\n• Multiple: B,C → A (via interfaces)\n\n**Benefits:**\n• Code reusability\n• Method overriding\n• Polymorphism\n\n**Example:** Dog inherits from Animal\n\nNeed a code example?";
        }
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
    if (lowerMsg.match(/(attendance|absent|present|class)/)) {
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
    if (lowerMsg.match(/(study|prepare|exam|test|revision|tips|strategy|how to)/)) {
        return "**Effective Study Strategies:**\n\n1. **Pomodoro Technique** ⏰\n   25 min focus + 5 min break\n\n2. **Active Recall** 🧠\n   Test yourself, don't just re-read\n\n3. **Spaced Repetition** 📅\n   Review at increasing intervals\n\n4. **Feynman Technique** 📝\n   Explain concepts in simple terms\n\n5. **Practice Problems** 📚\n   Solve previous year papers\n\n6. **Group Study** 👥\n   Discuss with peers\n\n**Exam Prep Checklist:**\n✓ Make summary notes\n✓ Solve past papers\n✓ Identify weak topics\n✓ Sleep well before exam\n\nWhich subject are you preparing for?";
    }

    // ========== CAREER & PLACEMENT ==========
    if (lowerMsg.match(/(career|job|placement|interview|resume|company|internship)/)) {
        return "**Career Guidance:**\n\n**For Tech Roles:**\n• Master DSA (LeetCode, HackerRank)\n• Build projects (GitHub portfolio)\n• Learn system design\n• Practice mock interviews\n\n**Top Companies:**\n• FAANG (Facebook, Amazon, Apple, Netflix, Google)\n• Microsoft, Adobe, Salesforce\n• Startups (better learning)\n\n**Resume Tips:**\n✓ Keep it 1-page\n✓ Quantify achievements\n✓ Highlight projects\n✓ Add certifications\n\n**Interview Prep:**\n• Technical: DSA + CS fundamentals\n• Behavioral: STAR method\n• System design: Scalability\n\nNeed specific guidance?";
    }

    // ========== PROGRAMMING LANGUAGES ==========
    if (lowerMsg.match(/(python|java|javascript|c\+\+|coding|programming)/)) {
        return "**Programming Language Guide:**\n\n**Python** 🐍\n• Easy to learn\n• Great for AI/ML, Data Science\n• Syntax: Simple and readable\n\n**Java** ☕\n• Enterprise applications\n• Android development\n• OOP focused\n\n**C++** ⚡\n• System programming\n• Game development\n• High performance\n\n**JavaScript** 🌐\n• Web development\n• Full-stack (Node.js)\n• Most popular\n\n**Learning Path:**\n1. Start with Python (easiest)\n2. Learn DSA\n3. Build projects\n4. Contribute to open source\n\nWhich language are you learning?";
    }

    // ========== DEFAULT INTELLIGENT RESPONSE ==========
    return `I'm your AI Study Buddy! I can help with:\n\n**📚 Academics:**\n• Data Structures & Algorithms\n• Object-Oriented Programming\n• Mathematics, Physics, Chemistry\n• Database, Operating Systems\n\n**📊 Your Performance:**\n• CGPA analysis and predictions\n• Attendance tracking\n• Weak subject identification\n\n**🎯 Study & Career:**\n• Study strategies and exam tips\n• Career guidance and placements\n• Time management\n• Interview preparation\n\n**💬 Ask me anything like:**\n• "Explain binary search trees"\n• "What is my CGPA?"\n• "How to prepare for exams?"\n• "Career advice for software engineer"\n\nWhat would you like to know?`;
}

module.exports = { generateEnhancedAIResponse };
