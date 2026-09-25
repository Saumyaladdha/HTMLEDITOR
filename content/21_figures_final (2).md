# अध्याय 3 : आव्यूह (Matrices)

> इस अध्याय से एक पेपर में औसतन **8 अंक** आते हैं। यह 2022 से 2026 तक के 20 सेटों को गिनकर निकाला गया है; हर सेट एक असली पेपर है।
> भाग 1 की 🔥 पंक्तियाँ 2020 के तीन सेट भी दिखाती हैं, इसलिए वहाँ 2020 का साल भी मिलेगा; ऊपर वाला औसत उनमें से नहीं निकला।

---

## 🎯 किस टॉपिक से कितने अंक

| टॉपिक | एक पेपर में लगभग कितने अंक |
|---|---|
| 3.10 आव्यूह-सर्वसमिका व व्युत्क्रम (Identity & Inverse) | **2 अंक** |
| 3.6 गुणन-समीकरण से अज्ञात आव्यूह (Product Equation) | **1 अंक** |
| 3.17 प्रारम्भिक संक्रियाओं से व्युत्क्रम (Elementary Operations) | **1 अंक** |
| 3.7 त्रिकोणमितीय गुणन की उपपत्ति (Matrix Proofs) | **1 अंक** |
| बाक़ी तेरह टॉपिक मिलाकर | **3 अंक** |
| **कुल** | **8 अंक** |

ऊपर के चार टॉपिक ही अध्याय के आधे से ज़्यादा बोर्ड-अंक देते हैं।
इन्हीं चार को ऊपर से नीचे के क्रम में पढ़ो, फिर बाक़ी पर आओ।

> 3.17 का 1 अंक पुराने पेपरों का है। वह 2020, 2022 और 2023 में आई; 2024 से 2026 के बारह सेटों में एक बार भी नहीं। इसीलिए नीचे के क्रम में वह 3.7 के बाद रखी गई है।

> कुछ सवालों पर `*यही सवाल N अंक पर प्र. X में*` लिखा मिलेगा। बोर्ड ने वही सवाल अलग सालों में अलग अंकों पर पूछा है, इसलिए दोनों जगह रखा है। हल एक ही है; फ़र्क़ इतना कि ज़्यादा अंक पर हर चरण पूरा लिखना पड़ता है और अंत में जाँच भी।

> 3.15 आव्यूह के शाब्दिक प्रश्न (Word Problems) से बोर्ड ने कभी कुछ नहीं पूछा।
> 3.16 आव्यूह-अध्याय का सूत्र-संग्रह (Formulae) से भी एक सवाल नहीं आया।

## 🏆 सबसे ज़्यादा बार यही उपपत्ति पूछी गई है

**दिखाइए कि $A^{3}-23A-40I=O$** वाली उपपत्ति तीन पेपरों में आ चुकी है।
वे दो अलग साल हैं, 2026 और 2020, और हर बार यह पूरे **5 अंक** की रही।
पूरा हल `प्र. 63` में है, और उसके चार चरण भाग 1 के अंत में 🧭 **उपपत्ति-चरण** कार्ड पर लिखे हैं।
वही चार चरण `प्र. 71` और `प्र. 81` में भी ज्यों के त्यों चलते हैं, क्योंकि वे भी घन-सर्वसमिका हैं।
`प्र. 65 · 78 · 79 · 86 · 87` में घात केवल वर्ग तक जाती है, पर सोच वही रहती है:
सर्वसमिका सिद्ध करके उसी से $A^{-1}$ निकालना।

## ✅ किस क्रम में पढ़ना है

| क्रम | क्या करना है | क्यों |
|---|---|---|
| 1 | भाग 1 के अंत का 🧭 उपपत्ति-चरण कार्ड पढ़ो। | हर पेपर में लगभग 2 अंक यहीं से |
| 2 | `प्र. 63` की उपपत्ति दो बार लिखो। | तीन पेपरों में आई, हर बार 5 अंक की |
| 3 | टॉपिक 3.6, फिर 3.7, फिर 3.17 पढ़ो। | पहले दो हर साल आते हैं, 3.17 2023 के बाद नहीं |
| 4 | भाग 2 के 47 बोर्ड-सवाल पहले हल करो। | 87 में से यही 47 पेपरों से हैं |
| 5 | बचे 40 पुस्तक-सवाल अभ्यास में लगाओ। | इन पर सेट-कोड नहीं है; कई पर पुस्तक ने साल दर्ज किया है |
| 6 | बाक़ी तेरह टॉपिक एक-एक बार पढ़ लो। | इनसे भी हर पेपर में 3 अंक आते हैं |

---

# PART 1 · QUICK REVISION

---

### 3.1 आव्यूह की कोटि व प्रकार (Order & Types)
🔥 UP 2022 · 1 अंक
🔥 UP 2026 · 1 अंक

कोटि $m \times n$ ⇒ अवयव $mn$।

**सूत्र:** वर्ग पर $m = n$ · $0$/$1$ वाले $= 2^{mn}$

**नमूना:** $2 \times 2$ पर $2^{4} = 16$

---

### 3.2 आव्यूहों की समानता (Equality)
🔥 UP 2020 · 2 अंक
🔥 UP 2023 × 2 · 2 + 1 अंक
🔥 UP 2024 × 2 · 2 + 1 अंक

समान कोटि पर $A = B \Leftrightarrow a_{ij} = b_{ij}$ होता है।

**विधि:** $kA$ और योग → $a_{ij} = b_{ij}$ → हल करो

**नमूना:** $2x + 3 = 7$, $2y - 4 = 14 \Rightarrow x = 2$, $y = 9$

⚠️ $xy = 8$ पर दोनों हल-युग्म लिखो।

---

### 3.3 आव्यूह-योग व अदिश गुणन (Addition & Scalars)
🔥 UP 2020 · 1 अंक
🔥 UP 2023 · 1 अंक
🔥 UP 2026 · 2 अंक

समान कोटि पर $A + B = [a_{ij} + b_{ij}]$ बनता है।

**सूत्र:** $kA = [k\,a_{ij}]$ · $A - B = A + (-1)B$

**नमूना:** $\cos\theta\,A + \sin\theta\,B = I$

---

### 3.4 अज्ञात आव्यूह का बीजगणित (Unknown Matrix)
🔥 UP 2023 · 5 अंक
🔥 UP 2024 · 5 अंक
🔥 UP 2025 · 1 अंक

अज्ञात $X$ को अलग करो।

**सूत्र:** $2A + 3X = 5B \Rightarrow X = \tfrac{1}{3}(5B - 2A)$ · $(X+Y)+(X-Y) = 2X$

**नमूना:** $2x - y = 10$, $3x + y = 5 \Rightarrow x = 3$, $y = -4$

---

### 3.5 आव्यूहों का गुणन (Multiplication)
🔥 UP 2022 × 3 · 2 + 1 + 1 अंक
🔥 UP 2023 · 1 अंक
🔥 UP 2024 · 2 अंक
🔥 UP 2025 · 1 अंक

$A_{m \times n}B_{n \times p}$ की कोटि $m \times p$ होती है।

**सूत्र:** $c_{ik} = \sum a_{ij}b_{jk}$ · प्रायः $AB \ne BA$

**विधि:** भीतरी मिलाओ → पंक्ति $\times$ स्तम्भ → जोड़ो

**नमूना:** $AB = \begin{bmatrix}7&1\\33&34\end{bmatrix} \ne BA$

⚠️ दोनों क्रम पूछे जाएँ तो दोनों पूरे निकालो।

---

### 3.6 गुणन-समीकरण से अज्ञात आव्यूह (Product Equation)
🔥 UP 2022 · 8 अंक
🔥 UP 2023 · 5 अंक
🔥 UP 2026 · 8 अंक

$CD - AB = O$ में $D$ अक्षर-आव्यूह मानो।

**सूत्र:** $D = \begin{bmatrix}a&b\\c&d\end{bmatrix}$ · $(AB)C = A(BC)$

**नमूना:** $CD = AB \Rightarrow 2a+5c=3,\ 3a+8c=43 \Rightarrow a=-191,\ c=77$

---

### 3.7 त्रिकोणमितीय गुणन की उपपत्ति (Matrix Proofs)
🔥 UP 2020 · 2 अंक
🔥 UP 2025 × 2 · 8 + 5 अंक

दोनों पक्ष अलग खोलकर संगत अवयव मिलाओ।

**सूत्र:** $\cos A\cos B - \sin A\sin B = \cos(A+B)$ · $\tan\tfrac{\alpha}{2} = \dfrac{\sin \alpha/2}{\cos \alpha/2}$

**नमूना:** $\cos\alpha\cos\tfrac{\alpha}{2} + \sin\tfrac{\alpha}{2}\sin\alpha = \cos\tfrac{\alpha}{2}$

---

### 3.8 आव्यूह की घात का प्रतिरूप (Powers)
🔥 UP 2020 · 5 अंक
🔥 UP 2023 · 2 अंक

$A^{2} = mA$ मिले, तो $A^{n} = m^{n-1}A$ बनता है।

**सूत्र:** $A = kI \Rightarrow A^{n} = k^{n-1}A$

**नमूना:** $A^{2} = 2A \Rightarrow A^{100} = 2^{99}A$

---

### 3.9 आव्यूह-बहुपद व गुणांक (Polynomial)
🔥 UP 2026 × 2 · 5 + 2 अंक

हर पद अलग आव्यूह बनाकर अवयवशः जोड़ो।

**सूत्र:** $A^{2} = kA - 2I$ · $A^{2} = A \Rightarrow (I+A)^{3} - 7A = I$ · $(I+A)^{2} - 7A = I - 4A$

**नमूना:** $A^{2} = kA - 2I \Rightarrow 4k = 4 \Rightarrow k = 1$

⚠️ $2I$ केवल विकर्ण पर $2$ रखता है।

---

### 3.10 आव्यूह-सर्वसमिका व व्युत्क्रम (Identity & Inverse)
🔥 UP 2020 · 5 अंक
🔥 UP 2022 × 2 · 5 + 4 अंक
🔥 UP 2023 · 4 अंक
🔥 UP 2025 × 2 · 8 + 5 अंक
🔥 UP 2026 × 2 · 5 + 5 अंक

$A^{3} - 23A - 40I = O$ सिद्ध करो।

**सूत्र:** $A(I - A) = I \Rightarrow A^{-1} = I - A$

**चरण:** $O$ सिद्ध करो → $I = A(\;)$ लिखो → कोष्ठक $= A^{-1}$

**नमूना:** $A^{2} - A + I = O \Rightarrow I = A(I - A) \Rightarrow A^{-1} = I - A$

⚠️ $A^{3} = A \cdot A^{2}$ से निकालना पड़ता है।

---

### 3.11 आव्यूह का परिवर्त (Transpose)
🔥 UP 2022 · 1 अंक
🔥 UP 2025 × 2 · 2 + 2 अंक
🔥 UP 2026 · 1 अंक

पंक्ति और स्तम्भ बदलने पर $A' = [a_{ji}]$ बनता है।

**सूत्र:** $(A')' = A$ · $(kA)' = kA'$ · $(A+B)' = A'+B'$ · $(AB)' = B'A'$

**चरण:** संक्रिया → परिवर्त → पक्ष मिलाओ

**नमूना:** $\begin{bmatrix}1&-1\\2&3\end{bmatrix}' = \begin{bmatrix}1&2\\-1&3\end{bmatrix}$

⚠️ परिवर्त में गुणनफल का क्रम उलटता है।

---

### 3.12 लम्बकोणीय व घूर्णन आव्यूह (Orthogonal)
🔥 UP 2020 · 1 अंक
🔥 UP 2023 · 1 अंक
🔥 UP 2024 · 1 अंक
🔥 UP 2025 · 2 अंक

$A'A = I$ वाला वर्ग आव्यूह लम्बकोणीय कहलाता है।

**सूत्र:** $A = \begin{bmatrix}\cos\alpha&\sin\alpha\\-\sin\alpha&\cos\alpha\end{bmatrix}$

**विधि:** $A'A = I$ रखो → विकर्ण मिलाओ → कोण निकालो

**नमूना:** $2x^{2} = 1 \Rightarrow x = \pm\tfrac{1}{\sqrt{2}}$

⚠️ वर्गमूल पर $\pm$ दोनों चिह्न लिखो।

---

### 3.13 सममित व विषम सममित आव्यूह (Symmetric & Skew)
🔥 UP 2022 · 5 अंक

$A' = A$ पर सममित और $A' = -A$ पर विषम सममित कहलाता है।

**सूत्र:** $A = P + Q$ · $P = \tfrac{1}{2}(A+A')$ · $Q = \tfrac{1}{2}(A-A')$

**नमूना:** $A' = -A$ पर $a_{31} = -a_{13} \Rightarrow x = 2$

⚠️ विषम सममित का विकर्ण शून्य।

---

### 3.14 गुणनफल का व्युत्क्रम (Product Inverse)
🔥 UP 2023 × 2 · 5 + 2 अंक
🔥 UP 2024 · 1 अंक
🔥 UP 2025 · 5 अंक

गुणनफल का व्युत्क्रम क्रम उलटकर बनता है।

**सूत्र:** $(AB)^{-1} = B^{-1}A^{-1}$ · $|A| = 0 \Rightarrow$ अव्युत्क्रमणीय

**चरण:** $(AB)(AB)^{-1} = I$ → $A^{-1}$ → $B^{-1}$ से पूर्वगुणन

**नमूना:** $\begin{bmatrix}2&3\\1&2\end{bmatrix}\begin{bmatrix}2&-3\\-1&2\end{bmatrix} = I$

⚠️ $AB$ और $BA$ दोनों दिखाने पड़ते हैं।

---

### 3.15 आव्यूह के शाब्दिक प्रश्न (Word Problems)

सूचना आव्यूह में लिखकर गुणा।

**सूत्र:** आय $= AB$ · लाभ $= AB - AC$ · $r\%$ $= \tfrac{r}{100}B$

**नमूना:** $1000(40) + 500(100) + 5000(50) = 340000$

---

### 3.16 आव्यूह-अध्याय का सूत्र-संग्रह (Formulae)

अध्याय के मानक परिणाम।

**सूत्र:** $A + O = A$ · $A + (-A) = O$ · $k(A+B) = kA + kB$ · $(k+l)A = kA + lA$

⚠️ $AB = O$ पर भी $A$, $B$ शून्य ज़रूरी नहीं (`प्र. 19 · 52`)।

---

### 3.17 प्रारम्भिक संक्रियाओं से व्युत्क्रम (Elementary Operations)
🔥 UP 2020 · 4 अंक
🔥 UP 2022 · 4 अंक
🔥 UP 2023 · 8 अंक

$[A \mid I]$ से चलकर $[I \mid A^{-1}]$ तक पहुँचो।

**सूत्र:** $AB = BA = I \Rightarrow B = A^{-1}$ · $AA^{-1} = A^{-1}A = I$ · $|A| = 0$ पर नहीं

⚠️ पुस्तक यह विधि नहीं देती; पूरे हल `प्र. 80 · 82 · 84` पर हैं।

⚠️ बोर्ड ने यह 2020, 2022 और 2023 में पूछी; 2024 से 2026 के बारह सेटों में एक बार भी नहीं।

---

> #### 📌 🧭 उपपत्ति-चरण
>
> ① $A^{2} = A \cdot A$
>
> ② $A^{3} = A \cdot A^{2}$
>
> ③ बहुपद का हर पद अलग आव्यूह बनाओ (जैसे $23A$, $40I$)
>
> ④ संगत अवयव जोड़कर $O$ पाओ
>
> ⑤ फिर $I = A(\;)$ लिखकर कोष्ठक $= A^{-1}$

> #### 📌 📖 परिभाषाएँ व गुणधर्म
>
> | नाम | पहचान |
> |---|---|
> | पंक्ति · स्तम्भ आव्यूह | कोटि $1 \times n$ · कोटि $m \times 1$ |
> | वर्ग · विकर्ण | $m = n$ · वर्ग, और विकर्ण के बाहर सब $0$ |
> | अदिश · तत्समक $I$ | विकर्ण पर वही $k$ · वही $k = 1$ |
> | शून्य आव्यूह $O$ | हर अवयव $0$ |
> | ऊपरी · निचला त्रिकोणीय | विकर्ण के नीचे सब $0$ · विकर्ण के ऊपर सब $0$ |
>
> **गुणन:** $(AB)C = A(BC)$ · $A(B+C) = AB + AC$ · प्रायः $AB \ne BA$ · $AB = O$ पर भी $A$, $B$ शून्य ज़रूरी नहीं
>
> **सममित व विषम सममित:** $A' = A$ · $A' = -A$ (विकर्ण सदा $0$) · $A + A'$ सदा सममित · $A - A'$ सदा विषम सममित
>
> **हर वर्ग आव्यूह का बँटवारा:** $A = P + Q$, जहाँ $P = \tfrac{1}{2}(A+A')$ सममित और $Q = \tfrac{1}{2}(A-A')$ विषम सममित; और यह बँटवारा अद्वितीय है। कारण: दो बँटवारे मानिए, तब $P_1 - P_2 = Q_2 - Q_1$ एक साथ सममित और विषम सममित है, इसलिए $O$ है (`प्र. 16`)।
>
> **व्युत्क्रम:** जो हो वह एक ही होता है · $AB = BA = I \Rightarrow B = A^{-1}$ · $(AB)^{-1} = B^{-1}A^{-1}$ · $(A')^{-1} = (A^{-1})'$ · $|A| = 0$ पर व्युत्क्रम नहीं
>
> **तीन प्रारम्भिक संक्रियाएँ:** $R_i \leftrightarrow R_j$ · $R_i \to k R_i\ (k \ne 0)$ · $R_i \to R_i + k R_j$; स्तम्भों पर भी वही तीन, $C$ लिखकर।

# PART 2 · QUESTIONS & ANSWERS

### बहुविकल्पीय प्रश्न (1 अंक)

#### 2026

#### वर्ग आव्यूह होने की शर्त, पंक्ति तथा स्तम्भ की संख्या
**प्र. 1**  `[1 अंक · 2026/set_a_db प्र.4]`

**$A=[a_{ij}]_{m\times n}$ एक वर्ग आव्यूह है, यदि**

|  |  |
|---|---|
| (A) $m<n$ | (B) $m>n$ |
| (C) $m=n$ | (D) इनमें से कोई नहीं |

**उत्तर:** (C) $m = n$
यदि आव्यूह में पंक्तियों तथा स्तम्भों की संख्या बराबर हो अर्थात् $m = n$ हो, तो उसे वर्ग आव्यूह (Square matrix) कहते हैं।

#### अचर से गुणित आव्यूह का परिवर्त $(KA)'$
**प्र. 2**  `[1 अंक · 2026/set_b_dc प्र.3]`

**यदि $A$ कोई आव्यूह है और $K$ कोई अचर है, तो $(KA)'$ होगा :**

|  |  |
|---|---|
| (A) $K'A'$ | (B) $A'K'$ |
| (C) $KA'$ | (D) $KA$ |

**उत्तर:** (C) $(KA)' = K \cdot A'$, जहाँ $K$ एक अदिश राशि है।

🔍 **दोनों विकल्प एक जैसे दिखते हैं** — (C) और (D) में फ़र्क़ सिर्फ़ $A$ के परिवर्त का है; अदिश $K$ पर परिवर्त होता ही नहीं।

#### 2025

#### $2X+Y$ तथा $Y$ दिए होने पर आव्यूह $X$
**प्र. 3**  `[1 अंक · 2025/set_b_jb प्र.5]`  *यही सवाल प्र. 21 में बिना विकल्प*

**यदि $2X+Y=\begin{bmatrix}1&0\\-3&2\end{bmatrix}$ तथा $Y=\begin{bmatrix}3&2\\1&4\end{bmatrix}$, तो $X$ होगा**

|  |  |
|---|---|
| (i) $\begin{bmatrix}-1&-1\\-2&-2\end{bmatrix}$ | (ii) $\begin{bmatrix}-1&-1\\-2&-1\end{bmatrix}$ |
| (iii) $\begin{bmatrix}-2&-1\\-1&-1\end{bmatrix}$ | (iv) $\begin{bmatrix}-1&-2\\-1&-1\end{bmatrix}$ |

**उत्तर:** (ii) $X = \begin{bmatrix} -1 & -1 \\ -2 & -1 \end{bmatrix}$

$2X + Y = \begin{bmatrix} 1 & 0 \\ -3 & 2 \end{bmatrix}$ तथा $Y = \begin{bmatrix} 3 & 2 \\ 1 & 4 \end{bmatrix}$

$Y$ का मान रखने पर,

$$\begin{aligned}
2X + \begin{bmatrix} 3 & 2 \\ 1 & 4 \end{bmatrix} &= \begin{bmatrix} 1 & 0 \\ -3 & 2 \end{bmatrix} \\
2X &= \begin{bmatrix} 1 & 0 \\ -3 & 2 \end{bmatrix} - \begin{bmatrix} 3 & 2 \\ 1 & 4 \end{bmatrix} \\
2X &= \begin{bmatrix} -2 & -2 \\ -4 & -2 \end{bmatrix}
\end{aligned}$$

$$\therefore\; \boxed{X = \begin{bmatrix} -1 & -1 \\ -2 & -1 \end{bmatrix}}$$

#### $m\times n$ तथा $n\times p$ कोटि के आव्यूहों के गुणनफल $AB$ की कोटि
**प्र. 4**  `[1 अंक · 2025/set_a_ja प्र.2 · 2022/set_a_ff प्र.2]`  *2022 में भी आया था*

**यदि आव्यूह $A$ और $B$ के क्रम (कोटि) क्रमशः: $m\times n$ और $n\times p$ हैं, तो $AB$ का क्रम है :**

|  |  |
|---|---|
| (i) $p\times m$ | (ii) $n\times m$ |
| (iii) $m\times p$ | (iv) इनमें से कोई नहीं |

**अथवा** *(2025)*

**यदि आव्यूहों $A$ और $B$ की कोटियाँ क्रमशः $m\times n$ और $n\times p$ हों, तो $AB$ की कोटि होगी**

|  |  |
|---|---|
| (i) $m\times p$ | (ii) $p\times m$ |
| (iii) $m\times n$ | (iv) $n\times p$ |

**उत्तर:** $AB$ का क्रम $= m \times p$ · 2022 के विकल्पों में (iii), 2025 के विकल्पों में (i)

दिया है, आव्यूह $A$ का क्रम $= m \times n$ तथा आव्यूह $B$ का क्रम $= n \times p$

$$\therefore\; \boxed{AB \text{ का क्रम } = m \times p}$$

⚠ **बोर्ड यहीं फँसाता है** — बीच वाला $n$ कट जाता है और बाहर के $m$ और $p$ बचते हैं; उलटा क्रम वाला विकल्प जाल है।

#### 2024

#### आव्यूह-समानता से $x$ तथा $y$ के मान
**प्र. 5**  `[1 अंक · 2024/set_c_fc प्र.4 · 2023/set_a_bb प्र.3]`  *2023 में भी आया था*

**यदि $\begin{bmatrix} 2x-y & x+2y \\ 2 & 3 \end{bmatrix}=\begin{bmatrix} 1 & 3 \\ 2 & 3 \end{bmatrix}$, तो $x$ और $y$ का मान होगा :**

|  |  |
|---|---|
| (i) $x=1,\ y=1$ | (ii) $x=2,\ y=1$ |
| (iii) $x=\frac{1}{2},\ y=\frac{1}{2}$ | (iv) $x=1,\ y=\frac{1}{2}$ |

**अथवा** *(2024)*

**यदि $\begin{bmatrix}2x-y & x+2y\\ 2 & 3\end{bmatrix}=\begin{bmatrix}1 & 3\\ 2 & 3\end{bmatrix}$ हो तो $x$ तथा $y$ का मान होगा**

|  |  |
|---|---|
| (i) $x=1,\ y=1$ | (ii) $x=\dfrac{1}{2},\ y=\dfrac{1}{2}$ |
| (iii) $x=2,\ y=1$ | (iv) $x=1,\ y=\dfrac{1}{2}$ |

**उत्तर:** (i) $x = 1,\ y = 1$

दिया है, $\begin{bmatrix} 2x - y & x + 2y \\ 2 & 3 \end{bmatrix} = \begin{bmatrix} 1 & 3 \\ 2 & 3 \end{bmatrix}$

संगत अवयवों की तुलना करने पर,

$$\begin{aligned}
2x - y &= 1 && \text{...(i)} \\
x + 2y &= 3 && \text{...(ii)}
\end{aligned}$$

समी (i) व (ii) को हल करने पर,

$$\therefore\; \boxed{x = 1 \text{ तथा } y = 1}$$

#### शर्त $A+A'=I$ से कोण $\alpha$ का मान, विकल्पों में से
**प्र. 6**  `[1 अंक · 2024/set_d_fd प्र.5]`  *यही सवाल प्र. 18 में बिना विकल्प*

**आव्यूह $A=\begin{bmatrix} \cos\alpha & -\sin\alpha \\ \sin\alpha & \cos\alpha \end{bmatrix}$ तथा $A+A'=I$ तो $\alpha$ का मान होगा**

|  |  |
|---|---|
| (i) $\frac{\pi}{6}$ | (ii) $\frac{\pi}{3}$ |
| (iii) $\pi$ | (iv) $\frac{3\pi}{2}$ |

**उत्तर:** (ii) $\alpha = \dfrac{\pi}{3}$

दिया है, $A + A' = I$

$$\begin{aligned}
\begin{bmatrix} \cos\alpha & -\sin\alpha \\ \sin\alpha & \cos\alpha \end{bmatrix} + \begin{bmatrix} \cos\alpha & \sin\alpha \\ -\sin\alpha & \cos\alpha \end{bmatrix} &= \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} \\
\begin{bmatrix} 2\cos\alpha & 0 \\ 0 & 2\cos\alpha \end{bmatrix} &= \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} \\
2\cos\alpha &= 1 \\
\cos\alpha &= \frac{1}{2}
\end{aligned}$$

$$\therefore\; \boxed{\alpha = \frac{\pi}{3}}$$

🧮 **calculation सँभालो, ग़लती यहीं होती है** — जोड़ने पर विकर्ण के बाहर वाले अवयव कट जाते हैं, इसलिए सिर्फ़ $2\cos\alpha = 1$ बचता है।

#### दो व्युत्क्रमणीय आव्यूहों के गुणनफल का व्युत्क्रम $(AB)^{-1}$
**प्र. 7**  `[1 अंक · 2024/set_b_fb प्र.5]`

**यदि $A$ तथा $B$ दो व्युत्क्रमणीय आव्यूह कोटि $n$ के हैं तो**

|  |  |
|---|---|
| (i) $(AB)^{-1}=B^{-1}A^{-1}$ | (ii) $(AB)^{-1}=A^{-1}B^{-1}$ |
| (iii) $(AB)^{-1}=A^{-1}B$ | (iv) $(AB)^{-1}=AB^{-1}$ |

**उत्तर:** (i) $(AB)^{-1} = B^{-1}A^{-1}$

#### 2023

#### दिए हुए $A$ तथा $B$ के लिए गुणनफल $BA$
**प्र. 8**  `[1 अंक · 2023/set_d_ay प्र.2]`

**यदि $A=\begin{bmatrix}0 & 1\\1 & 0\end{bmatrix}$ तथा $B=\begin{bmatrix}1 & 0\\0 & -1\end{bmatrix}$, तब $BA$ होगा**

|  |  |
|---|---|
| (i) $\begin{bmatrix}-1 & 0\\0 & 1\end{bmatrix}$ | (ii) $\begin{bmatrix}0 & -1\\1 & 0\end{bmatrix}$ |
| (iii) $\begin{bmatrix}0 & -1\\-1 & 0\end{bmatrix}$ | (iv) $\begin{bmatrix}0 & 1\\-1 & 0\end{bmatrix}$ |

**उत्तर:** (iv) $BA = \begin{bmatrix} 0 & 1 \\ -1 & 0 \end{bmatrix}$

$A = \begin{bmatrix} 0 & 1 \\ 1 & 0 \end{bmatrix}$ तथा $B = \begin{bmatrix} 1 & 0 \\ 0 & -1 \end{bmatrix}$

$$\begin{aligned}
BA &= \begin{bmatrix} 1 & 0 \\ 0 & -1 \end{bmatrix}\begin{bmatrix} 0 & 1 \\ 1 & 0 \end{bmatrix} \\
&= \begin{bmatrix} 0+0 & 1+0 \\ 0-1 & 0+0 \end{bmatrix}
\end{aligned}$$

$$\therefore\; \boxed{BA = \begin{bmatrix} 0 & 1 \\ -1 & 0 \end{bmatrix}}$$

🔍 **दोनों विकल्प एक जैसे दिखते हैं** — (ii) और (iv) में सिर्फ़ ऋण-चिह्न की जगह बदली है; $BA$ पूछा है, इसलिए पंक्ति $B$ की लो।

#### 2022

#### शून्य या एक अवयवों वाले $3\times3$ आव्यूहों की कुल संख्या
**प्र. 9**  `[1 अंक · 2022/set_d_fj प्र.3]`

**$3\times3$ कोटि के ऐसे आव्यूहों की कुल संख्या कितनी होगी जिनके प्रत्येक अवयव $0$ या $1$ है?**

|  |  |
|---|---|
| (i) $512$ | (ii) $81$ |
| (iii) $18$ | (iv) $27$ |

**उत्तर:** (i) $512$
यदि किसी दी कोटि (जैसे $2 \times 2$ या $3 \times 3$) के आव्यूह की प्रत्येक प्रविष्टि केवल 0 या 1 हो सकती है, तो प्रत्येक अवयव के लिए 2 विकल्प होते हैं।
कुल प्रविष्टियाँ $= 3 \times 3 = 9$; प्रत्येक के 2 विकल्प।

$$\therefore\; \boxed{\text{कुल आव्यूह} = 2^{9} = 512}$$

#### 2020

#### $\cos\theta$ तथा $\sin\theta$ से गुणित दो आव्यूहों के योग का मान
**प्र. 10**  `[1 अंक · 2020/set_a_xa प्र.2]`

**$\cos\theta\begin{bmatrix}\cos\theta & -\sin\theta\\ \sin\theta & \cos\theta\end{bmatrix}+\sin\theta\begin{bmatrix}\sin\theta & \cos\theta\\ -\cos\theta & \sin\theta\end{bmatrix}$ का मान है**

|  |  |
|---|---|
| (i) $\begin{bmatrix}0 & 0\\ 0 & 0\end{bmatrix}$ | (ii) $\begin{bmatrix}1 & 0\\ 0 & 1\end{bmatrix}$ |
| (iii) $\begin{bmatrix}0 & 1\\ 1 & 0\end{bmatrix}$ | (iv) इनमें से कोई नहीं |

**उत्तर:** (ii) $\begin{bmatrix}1 & 0\\ 0 & 1\end{bmatrix} = I$

$\cos\theta\cdot A + \sin\theta\cdot B$ प्रकार के अदिश-गुणित आव्यूहों को जोड़कर, सर्वसमिका $\sin^{2}\theta + \cos^{2}\theta = 1$ के प्रयोग से सरल कर तत्समक आव्यूह $I$ प्राप्त किया जाता है।

अदिश-गुणन करने पर:

$$\begin{aligned}
&\cos\theta\begin{bmatrix}\cos\theta & -\sin\theta\\ \sin\theta & \cos\theta\end{bmatrix} + \sin\theta\begin{bmatrix}\sin\theta & \cos\theta\\ -\cos\theta & \sin\theta\end{bmatrix} \\
&= \begin{bmatrix}\cos^{2}\theta & -\sin\theta\cos\theta\\ \sin\theta\cos\theta & \cos^{2}\theta\end{bmatrix} + \begin{bmatrix}\sin^{2}\theta & \sin\theta\cos\theta\\ -\sin\theta\cos\theta & \sin^{2}\theta\end{bmatrix} && \text{[हर अवयव अपने अदिश से गुणा]} \\
&= \begin{bmatrix}\cos^{2}\theta + \sin^{2}\theta & -\sin\theta\cos\theta + \sin\theta\cos\theta\\ \sin\theta\cos\theta - \sin\theta\cos\theta & \cos^{2}\theta + \sin^{2}\theta\end{bmatrix} && \text{[संगत अवयव जोड़े]}
\end{aligned}$$

$$\therefore\; \boxed{\begin{bmatrix}1 & 0\\ 0 & 1\end{bmatrix} = I}$$

#### पुराने वर्ष

> साल पुस्तक के दर्ज किए हैं, सेट-कोड नहीं।

**प्र. 11**  `[1 अंक · 2025 · 2024 · 2023 · बहुविकल्पीय प्रश्न]`

**यदि $A$ वर्ग आव्यूह इस प्रकार है कि $A^2 = A$, तो $(I + A)^3 - 7A$ बराबर होगा**

|  |  |
|---|---|
| (a) $A$ | (b) $I - A$ |
| (c) $I$ | (d) $3A$ |

**उत्तर:** (c) $I$

यहाँ, $A^2 = A$

$$\begin{aligned}
(I + A)^3 - 7A &= I^3 + A^3 + 3I^2A + 3A^2I - 7A && [\because (a + b)^3 = a^3 + b^3 + 3ab^2 + 3a^2b] \\
&= I + A^3 + 3A + 3A^2 - 7A \\
&= I + A^2 \cdot A + 3A + 3A - 7A && [\because A^2 = A] \\
&= I + A \cdot A - A = I + A - A && [\because A^2 = A] \\
&= I
\end{aligned}$$

$$\therefore\; \boxed{(I + A)^3 - 7A = I}$$

**प्र. 12**  `[1 अंक · 2023 · बहुविकल्पीय प्रश्न]`

**समान कोटि के दो दिए गए आव्यूहों $A$ तथा $B$ के लिए उपयुक्त कथन होगा**

|  |  |
|---|---|
| (a) $(AB)' = A'B'$ | (b) $(AB)' = AB$ |
| (c) $(AB)' = B'A'$ | (d) $(AB)' = BA$ |

**उत्तर:** (c) $(AB)' = B'A'$

$A$ और $B$ समान कोटि के दो आव्यूह हैं, तब

$$\therefore\; \boxed{(AB)' = B'A'}$$

🔗 **यह वही सवाल है** — यही $(AB)'=B'A'$ प्र. 55, प्र. 61 और प्र. 74 में सत्यापन बनकर आता है; एक बार कर लो तो चारों हो जाएँगे।

**प्र. 13**  `[1 अंक · 2014 · बहुविकल्पीय प्रश्न]`

**$x$ तथा $y$ के मान क्या होंगे, यदि $\left[\begin{array}{cc} x & y \\ 3y & x \end{array}\right]\left[\begin{array}{l} 1 \\ 2 \end{array}\right] = \left[\begin{array}{l} 3 \\ 5 \end{array}\right]$ हो?**

|  |  |
|---|---|
| (a) 2, 2 | (b) 3, 3 |
| (c) 1, 1 | (d) 4, 5 |

**उत्तर:** (c) $1,\ 1$

दिया है, $\begin{bmatrix} x & y \\ 3y & x \end{bmatrix}\begin{bmatrix} 1 \\ 2 \end{bmatrix} = \begin{bmatrix} 3 \\ 5 \end{bmatrix}$

बाएँ पक्ष के आव्यूहों की गुणा करने पर,

$$\begin{bmatrix} x \cdot 1 + 2 \cdot y \\ 3y \cdot 1 + 2 \cdot x \end{bmatrix} = \begin{bmatrix} 3 \\ 5 \end{bmatrix} \Rightarrow \begin{bmatrix} x + 2y \\ 3y + 2x \end{bmatrix} = \begin{bmatrix} 3 \\ 5 \end{bmatrix}$$

अब, संगत अवयवों की तुलना करने पर,

$$\begin{aligned}
x + 2y &= 3 && \text{...(i)} \\
3y + 2x &= 5 && \text{...(ii)}
\end{aligned}$$

समी (i) में 2 से गुणा करके प्राप्त समीकरण में से समी (ii) को घटाने पर,

$$\begin{aligned}
2x + 4y &= 6 \\
2x + 3y &= 5 \\
y &= 1
\end{aligned}$$

$y$ का मान समी (i) में रखने पर, $x + 2 = 3 \Rightarrow x = 1$

$$\therefore\; \boxed{x = 1,\ y = 1}$$

#### पुस्तक से

**प्र. 14**  `[1 अंक · बहुविकल्पीय प्रश्न]`

**यदि किसी आव्यूह में 10 अवयव हैं, तो इसकी सम्भव कोटियों की संख्या होगी**

|  |  |
|---|---|
| (a) 1 | (b) 2 |
| (c) 4 | (d) 5 |

**उत्तर:** (c) सम्भव कोटियों की संख्या $= 4$
आव्यूह में कुल अवयव $= 10$; इसकी निम्नलिखित कोटियाँ हो सकती हैं

$$1 \times 10,\ 10 \times 1,\ 2 \times 5,\ 5 \times 2$$

$$\therefore\; \boxed{\text{सम्भव कोटियों की संख्या} = 4}$$

🧮 **calculation सँभालो, ग़लती यहीं होती है** — 10 के हर जोड़े को दोनों क्रमों में गिनो; $2\times5$ और $5\times2$ अलग कोटियाँ हैं।

**प्र. 15**  `[1 अंक · बहुविकल्पीय प्रश्न]`

**आव्यूह $A$ तथा $B$ एक-दूसरे के व्युत्क्रम होंगे केवल यदि [NCERT Exemplar]**

|  |  |
|---|---|
| (a) $AB = BA$ | (b) $AB = BA = 0$ |
| (c) $AB = 0, BA = I$ | (d) $AB = BA = I$ |

**उत्तर:** (d) $AB = BA = I$, केवल इस स्थिति में $A$ और $B$ एक-दूसरे के व्युत्क्रम होंगे।

**प्र. 16**  `[1 अंक · बहुविकल्पीय प्रश्न]`

**यदि एक आव्यूह सममित तथा विषम सममित दोनों ही हैं, तो**

|  |  |
|---|---|
| (a) $A$ एक विकर्ण आव्यूह है। | (b) $A$ एक शून्य आव्यूह है। |
| (c) $A$ एक वर्ग आव्यूह है। | (d) उपरोक्त में से कोई नहीं |

⚠ प्रश्न के कथन में आव्यूह का नाम छपा ही नहीं है, पर चारों विकल्प उसे $A$ कहते हैं।

⚠ **स्रोत-नोट:** पुस्तक के इस हल में कोटि $n \times m$ छपी है, जो छपाई की भूल है; सममित तथा विषम सममित दोनों वर्ग आव्यूह पर ही परिभाषित हैं, इसलिए नीचे कोटि $n \times n$ लिखी गई है।

**उत्तर:** (b) $A$ एक शून्य आव्यूह है।

माना $A = [a_{ij}]_{n \times n}$ एक सममित आव्यूह है, तब

$$a_{ij} = a_{ji} \qquad \text{...(i)}$$

पुन: माना $A = [a_{ij}]_{n \times n}$ एक विषम सममित आव्यूह है, तब

$$a_{ij} = -a_{ji} \qquad \text{...(ii)}$$

समी (i) व (ii) को जोड़ने पर,

$$\begin{aligned}
2a_{ij} &= a_{ji} - a_{ji} \\
2a_{ij} &= 0 \\
a_{ij} &= 0
\end{aligned}$$

$$\therefore\; \boxed{A \text{ एक शून्य आव्यूह है।}}$$

🧠 **पूरा जवाब इसी एक लाइन में है** — दोनों शर्तें एक साथ लगते ही हर अवयव अपने ही ऋण के बराबर हो जाता है, यानी शून्य।

### एक शब्द उत्तरीय प्रश्न (1 अंक)

#### 2023

#### दिए हुए दो आव्यूहों का योग $(A+B)$ तथा अंतर $(A-B)$
**प्र. 17**  `[1 अंक · 2023/set_d_ay प्र.15]`

**यदि $A=\begin{bmatrix}2&4\\3&2\end{bmatrix}$ तथा $B=\begin{bmatrix}1&3\\-2&5\end{bmatrix}$ हैं, तो $(A+B)$ तथा $(A-B)$ का मान ज्ञात कीजिए।**

**उत्तर:** दिया है, $A = \begin{bmatrix} 2 & 4 \\ 3 & 2 \end{bmatrix}$ तथा $B = \begin{bmatrix} 1 & 3 \\ -2 & 5 \end{bmatrix}$

$$\begin{aligned}
A + B &= \begin{bmatrix} 2 & 4 \\ 3 & 2 \end{bmatrix} + \begin{bmatrix} 1 & 3 \\ -2 & 5 \end{bmatrix} = \begin{bmatrix} 3 & 7 \\ 1 & 7 \end{bmatrix} && \text{[योग करने पर]} \\
A - B &= \begin{bmatrix} 2 & 4 \\ 3 & 2 \end{bmatrix} - \begin{bmatrix} 1 & 3 \\ -2 & 5 \end{bmatrix} = \begin{bmatrix} 1 & 1 \\ 5 & -3 \end{bmatrix} && \text{[व्यवकलन करने पर]}
\end{aligned}$$ -----------**[½ अंक]** -----------**[½ अंक]**

$$\therefore\; \boxed{A + B = \begin{bmatrix} 3 & 7 \\ 1 & 7 \end{bmatrix}},\ \boxed{A - B = \begin{bmatrix} 1 & 1 \\ 5 & -3 \end{bmatrix}}$$

#### शर्त $A+A'=I$ से कोण $\alpha$ का मान
**प्र. 18**  `[1 अंक · 2023/set_a_bb प्र.12 · 2020/set_c_xc प्र.7]`  *2020 में भी आया था*  *यही सवाल प्र. 6 में विकल्पों के साथ*

**यदि $A=\begin{bmatrix}\cos\alpha & -\sin\alpha \\ \sin\alpha & \cos\alpha\end{bmatrix}$ तथा $A+A'=I$ हो, तो $\alpha$ का मान है**

**अथवा** *(2023)*

**यदि $A = \begin{bmatrix} \cos \alpha & -\sin \alpha \\ \sin \alpha & \cos \alpha \end{bmatrix}$ तथा $A + A' = I$, तो $\alpha$ का मान ज्ञात कीजिए।**

**उत्तर:** दिया है, $A + A' = I$

$$\begin{aligned}
\begin{bmatrix} \cos\alpha & -\sin\alpha \\ \sin\alpha & \cos\alpha \end{bmatrix} + \begin{bmatrix} \cos\alpha & \sin\alpha \\ -\sin\alpha & \cos\alpha \end{bmatrix} &= \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} \\
\begin{bmatrix} 2\cos\alpha & 0 \\ 0 & 2\cos\alpha \end{bmatrix} &= \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} \\
2\cos\alpha &= 1 \\
\cos\alpha &= \frac{1}{2}
\end{aligned}$$

$$\therefore\; \boxed{\alpha = \frac{\pi}{3}}$$

#### 2022

#### दिए हुए दो आव्यूहों का गुणनफल $AB$
**प्र. 19**  `[1 अंक · 2022/set_c_fi प्र.13]`

**यदि $A=\begin{bmatrix}0 & -1 \\ 0 & 2\end{bmatrix}$ तथा $B=\begin{bmatrix}3 & 5 \\ 0 & 0\end{bmatrix}$ है तो $AB$ का मान ज्ञात कीजिए।**

**उत्तर:**

$$\begin{aligned}
AB &= \begin{bmatrix}0 & -1\\ 0 & 2\end{bmatrix}\begin{bmatrix}3 & 5\\ 0 & 0\end{bmatrix} \\
&= \begin{bmatrix}0+0 & 0+0\\ 0+0 & 0+0\end{bmatrix}
\end{aligned}$$

$$\therefore\; \boxed{AB = \begin{bmatrix} 0 & 0 \\ 0 & 0 \end{bmatrix}}$$

#### परिवर्त का अंतर-गुणधर्म $(A-B)'=A'-B'$ की उपपत्ति
**प्र. 20**  `[1 अंक · 2022/set_b_fh प्र.9]`

**यदि $A'=\begin{bmatrix}3&4\\-1&2\\0&1\end{bmatrix}$ और $B=\begin{bmatrix}-1&2&1\\1&2&3\end{bmatrix}$ तो सिद्ध कीजिए $(A-B)'=A'-B'$।**

**उत्तर:** यहाँ, दायाँ पक्ष $= A' - B'$

$$\begin{aligned}
A' - B' &= \begin{bmatrix} 3 & 4 \\ -1 & 2 \\ 0 & 1 \end{bmatrix} - \begin{bmatrix} -1 & 1 \\ 2 & 2 \\ 1 & 3 \end{bmatrix} \\
&= \begin{bmatrix} 3+1 & 4-1 \\ -1-2 & 2-2 \\ 0-1 & 1-3 \end{bmatrix} = \begin{bmatrix} 4 & 3 \\ -3 & 0 \\ -1 & -2 \end{bmatrix}
\end{aligned}$$ -----------**[½ अंक]**

बायाँ पक्ष $= (A - B)'$

$$\begin{aligned}
(A - B)' &= \left(\begin{bmatrix} 3 & -1 & 0 \\ 4 & 2 & 1 \end{bmatrix} - \begin{bmatrix} -1 & 2 & 1 \\ 1 & 2 & 3 \end{bmatrix}\right)' && [\because A = (A')'] \\
&= \begin{bmatrix} 3+1 & -1-2 & 0-1 \\ 4-1 & 2-2 & 1-3 \end{bmatrix}' \\
&= \begin{bmatrix} 4 & -3 & -1 \\ 3 & 0 & -2 \end{bmatrix}' = \begin{bmatrix} 4 & 3 \\ -3 & 0 \\ -1 & -2 \end{bmatrix}
\end{aligned}$$ -----------**[½ अंक]**

$$\therefore\; \boxed{(A - B)' = A' - B'}$$

इति सिद्धम्

⚠ **बोर्ड यहीं फँसाता है** — दिया $A'$ है और $B$; दोनों के परिवर्त पहले निकालो, तभी दोनों पक्ष बन पाएँगे।

#### पुराने वर्ष

> साल पुस्तक के दर्ज किए हैं, सेट-कोड नहीं।

**प्र. 21**  `[1 अंक · 2023 · एक शब्द उत्तरीय प्रश्न]`  *यही सवाल प्र. 3 में विकल्पों के साथ*

**यदि $2X + Y = \begin{bmatrix} 1 & 0 \\ -3 & 2 \end{bmatrix}$ और $Y = \begin{bmatrix} 3 & 2 \\ 1 & 4 \end{bmatrix}$, तो $X$ ज्ञात कीजिए।**

**उत्तर:** दिया है, $2X + Y = \begin{bmatrix} 1 & 0 \\ -3 & 2 \end{bmatrix}$ तथा $Y = \begin{bmatrix} 3 & 2 \\ 1 & 4 \end{bmatrix}$

$Y$ का मान रखने पर,

$$\begin{aligned}
2X + \begin{bmatrix} 3 & 2 \\ 1 & 4 \end{bmatrix} &= \begin{bmatrix} 1 & 0 \\ -3 & 2 \end{bmatrix} \\
2X &= \begin{bmatrix} 1 & 0 \\ -3 & 2 \end{bmatrix} - \begin{bmatrix} 3 & 2 \\ 1 & 4 \end{bmatrix} \\
2X &= \begin{bmatrix} -2 & -2 \\ -4 & -2 \end{bmatrix}
\end{aligned}$$ -----------**[½ अंक]**

$$\therefore\; \boxed{X = \begin{bmatrix} -1 & -1 \\ -2 & -1 \end{bmatrix}}$$ -----------**[½ अंक]**

**प्र. 22**  `[1 अंक · 2024 · 2023 · एक शब्द उत्तरीय प्रश्न]`

**यदि $X + Y = \begin{bmatrix} 7 & 0 \\ 2 & 5 \end{bmatrix}, X - Y = \begin{bmatrix} 3 & 0 \\ 0 & 3 \end{bmatrix}$ है, तो $X$ का मान ज्ञात कीजिए।**

**उत्तर:** $$\begin{aligned}
X + Y &= \begin{bmatrix} 7 & 0 \\ 2 & 5 \end{bmatrix} && \text{...(i)} \\
X - Y &= \begin{bmatrix} 3 & 0 \\ 0 & 3 \end{bmatrix} && \text{...(ii)}
\end{aligned}$$

समी (i) और (ii) को जोड़ने पर,

$$2X = \begin{bmatrix} 10 & 0 \\ 2 & 8 \end{bmatrix}$$

$$\therefore\; \boxed{X = \begin{bmatrix} 5 & 0 \\ 1 & 4 \end{bmatrix}}$$

**प्र. 23**  `[1 अंक · 2024 · 2020 · NCERT · एक शब्द उत्तरीय प्रश्न]`  *यही सवाल 2 अंक पर प्र. 39 में*

**$x$ तथा $y$ ज्ञात कीजिए, यदि $2\begin{bmatrix} 1 & 3 \\ 0 & x \end{bmatrix} + \begin{bmatrix} y & 0 \\ 1 & 2 \end{bmatrix} = \begin{bmatrix} 5 & 6 \\ 1 & 8 \end{bmatrix}$**

**उत्तर:** दिया है, $2\begin{bmatrix} 1 & 3 \\ 0 & x \end{bmatrix} + \begin{bmatrix} y & 0 \\ 1 & 2 \end{bmatrix} = \begin{bmatrix} 5 & 6 \\ 1 & 8 \end{bmatrix}$

$$\begin{aligned}
\begin{bmatrix} 2+y & 6+0 \\ 0+1 & 2x+2 \end{bmatrix} &= \begin{bmatrix} 5 & 6 \\ 1 & 8 \end{bmatrix} \\
\begin{bmatrix} 2+y & 6 \\ 1 & 2x+2 \end{bmatrix} &= \begin{bmatrix} 5 & 6 \\ 1 & 8 \end{bmatrix}
\end{aligned}$$ -----------**[½ अंक]**

समान आव्यूह की परिभाषा से, हम जानते हैं कि ज्ञात आव्यूह समान हैं, तो इनके संगत अवयव भी समान होंगे। अतः संगत अवयवों को समान रखने पर,

$$\begin{aligned}
2 + y &= 5 && \text{...(i)} \\
2x + 2 &= 8 && \text{...(ii)}
\end{aligned}$$

समी (i) व (ii) से,

$$\begin{aligned}
y &= 5 - 2 = 3 \\
2x &= 8 - 2 \\
x &= \frac{6}{2} = 3
\end{aligned}$$ -----------**[½ अंक]**

$$\therefore\; \boxed{x = 3,\ y = 3}$$

**प्र. 24**  `[1 अंक · 2024 · 2023 · एक शब्द उत्तरीय प्रश्न]`

**आव्यूह $AB$ ज्ञात कीजिए, यदि $A = \begin{bmatrix} 1 & -2 & 3 \\ -4 & 2 & 5 \end{bmatrix}$ और $B = \begin{bmatrix} 2 & 3 \\ 4 & 5 \\ 2 & 1 \end{bmatrix}$**

**उत्तर:** $$\begin{aligned}
AB &= \begin{bmatrix} 1 & -2 & 3 \\ -4 & 2 & 5 \end{bmatrix} \times \begin{bmatrix} 2 & 3 \\ 4 & 5 \\ 2 & 1 \end{bmatrix} \\
&= \begin{bmatrix} 2-8+6 & 3-10+3 \\ -8+8+10 & -12+10+5 \end{bmatrix}
\end{aligned}$$

$$\therefore\; \boxed{AB = \begin{bmatrix} 0 & -4 \\ 10 & 3 \end{bmatrix}}$$

**प्र. 25**  `[1 अंक · 2022 · एक शब्द उत्तरीय प्रश्न]`  *यही सवाल 2 अंक पर प्र. 34 में*

**$2A - B$ ज्ञात कीजिए यदि $A = \begin{bmatrix} 1 & 2 & 3 \\ 2 & 3 & 1 \end{bmatrix}$ तथा $B = \begin{bmatrix} 3 & -1 & 3 \\ -1 & 0 & 2 \end{bmatrix}$**

**उत्तर:** दिया है, $A = \begin{bmatrix} 1 & 2 & 3 \\ 2 & 3 & 1 \end{bmatrix}$ तथा $B = \begin{bmatrix} 3 & -1 & 3 \\ -1 & 0 & 2 \end{bmatrix}$

$$2A = \begin{bmatrix} 2 & 4 & 6 \\ 4 & 6 & 2 \end{bmatrix}$$ -----------**[½ अंक]**

$$\begin{aligned}
2A - B &= \begin{bmatrix} 2 & 4 & 6 \\ 4 & 6 & 2 \end{bmatrix} - \begin{bmatrix} 3 & -1 & 3 \\ -1 & 0 & 2 \end{bmatrix} \\
&= \begin{bmatrix} 2-3 & 4+1 & 6-3 \\ 4+1 & 6-0 & 2-2 \end{bmatrix}
\end{aligned}$$

$$\therefore\; \boxed{2A - B = \begin{bmatrix} -1 & 5 & 3 \\ 5 & 6 & 0 \end{bmatrix}}$$ -----------**[½ अंक]**

🧮 **calculation सँभालो, ग़लती यहीं होती है** — $B$ के बीच वाला अवयव $-1$ है, इसलिए घटाने पर $4+1=5$ बनता है; ऋण का ऋण यहीं भूलते हैं।

**प्र. 26**  `[1 अंक · 2019 · एक शब्द उत्तरीय प्रश्न]`  *यही सवाल 5 अंक पर प्र. 67 में*

**यदि $X + Y = \begin{bmatrix} 5 & 2 \\ 0 & 9 \end{bmatrix}$ तथा $X - Y = \begin{bmatrix} 3 & 6 \\ 0 & -1 \end{bmatrix}$ है, तो $X$ तथा $Y$ ज्ञात कीजिए।**

**उत्तर:** दोनों समीकरण जोड़ने पर:

$$\begin{aligned}
2X &= \begin{bmatrix}5 & 2\\ 0 & 9\end{bmatrix} + \begin{bmatrix}3 & 6\\ 0 & -1\end{bmatrix} = \begin{bmatrix}8 & 8\\ 0 & 8\end{bmatrix} \\
X &= \frac{1}{2}\begin{bmatrix}8 & 8\\ 0 & 8\end{bmatrix} = \begin{bmatrix}4 & 4\\ 0 & 4\end{bmatrix}
\end{aligned}$$

दोनों समीकरण घटाने पर:

$$\begin{aligned}
2Y &= \begin{bmatrix}5 & 2\\ 0 & 9\end{bmatrix} - \begin{bmatrix}3 & 6\\ 0 & -1\end{bmatrix} = \begin{bmatrix}2 & -4\\ 0 & 10\end{bmatrix} \\
Y &= \frac{1}{2}\begin{bmatrix}2 & -4\\ 0 & 10\end{bmatrix} = \begin{bmatrix}1 & -2\\ 0 & 5\end{bmatrix}
\end{aligned}$$

$$\therefore\; \boxed{X = \begin{bmatrix} 4 & 4 \\ 0 & 4 \end{bmatrix}},\ \boxed{Y = \begin{bmatrix} 1 & -2 \\ 0 & 5 \end{bmatrix}}$$

**प्र. 27**  `[1 अंक · 2019 · एक शब्द उत्तरीय प्रश्न]`

**यदि $A = \begin{bmatrix} 2 & 4 \\ 3 & 2 \end{bmatrix}$ तथा $B = \begin{bmatrix} 1 & 3 \\ -2 & 5 \end{bmatrix}$, तो $B \cdot A$ ज्ञात कीजिए।**

**उत्तर:** दिया है, $A = \begin{bmatrix} 2 & 4 \\ 3 & 2 \end{bmatrix}$ तथा $B = \begin{bmatrix} 1 & 3 \\ -2 & 5 \end{bmatrix}$

$$\begin{aligned}
B \cdot A &= \begin{bmatrix} 1 & 3 \\ -2 & 5 \end{bmatrix}\begin{bmatrix} 2 & 4 \\ 3 & 2 \end{bmatrix} \\
&= \begin{bmatrix} 1 \times 2 + 3 \times 3 & 1 \times 4 + 3 \times 2 \\ -2 \times 2 + 5 \times 3 & -2 \times 4 + 5 \times 2 \end{bmatrix}
\end{aligned}$$

$$\therefore\; \boxed{B \cdot A = \begin{bmatrix} 11 & 10 \\ 11 & 2 \end{bmatrix}}$$

**प्र. 28**  `[1 अंक · 2018 · 2017 · एक शब्द उत्तरीय प्रश्न]`

**यदि $A = \begin{bmatrix} 2+i & -i \\ 3 & 4i \end{bmatrix}$ तथा $B = \begin{bmatrix} 1+i & 2i \\ 2i & 3 \end{bmatrix}$ हो, तो $A + B$ का मान बताइए।**

**उत्तर:** दिया है, $A = \begin{bmatrix} 2+i & -i \\ 3 & 4i \end{bmatrix}$ तथा $B = \begin{bmatrix} 1+i & 2i \\ 2i & 3 \end{bmatrix}$

$$\begin{aligned}
A + B &= \begin{bmatrix} 2+i & -i \\ 3 & 4i \end{bmatrix} + \begin{bmatrix} 1+i & 2i \\ 2i & 3 \end{bmatrix} \\
&= \begin{bmatrix} 2+i+1+i & -i+2i \\ 3+2i & 4i+3 \end{bmatrix}
\end{aligned}$$

$$\therefore\; \boxed{A + B = \begin{bmatrix} 3+2i & i \\ 3+2i & 4i+3 \end{bmatrix}}$$

**प्र. 29**  `[1 अंक · 2018 · 2017 · 2014 · 2009 · 2007 · 2006 · एक शब्द उत्तरीय प्रश्न]`

**यदि $X + Y = \begin{bmatrix} 2 & 1 \\ 1 & 2 \end{bmatrix}$ तथा $2X - Y = \begin{bmatrix} 1 & 2 \\ 2 & 1 \end{bmatrix}$, तो $X$ का मान ज्ञात कीजिए।**

**उत्तर:** दिया है,

$$\begin{aligned}
X + Y &= \begin{bmatrix} 2 & 1 \\ 1 & 2 \end{bmatrix} && \text{...(i)} \\
2X - Y &= \begin{bmatrix} 1 & 2 \\ 2 & 1 \end{bmatrix} && \text{...(ii)}
\end{aligned}$$

दोनों समीकरणों को जोड़ने पर,

$$\begin{aligned}
X + Y + 2X - Y &= \begin{bmatrix} 2 & 1 \\ 1 & 2 \end{bmatrix} + \begin{bmatrix} 1 & 2 \\ 2 & 1 \end{bmatrix} \\
3X &= \begin{bmatrix} 2+1 & 1+2 \\ 1+2 & 2+1 \end{bmatrix} \\
3X &= \begin{bmatrix} 3 & 3 \\ 3 & 3 \end{bmatrix}
\end{aligned}$$

3 से भाग करने पर,

$$X = \frac{1}{3}\begin{bmatrix} 3 & 3 \\ 3 & 3 \end{bmatrix}$$

$$\therefore\; \boxed{X = \begin{bmatrix} 1 & 1 \\ 1 & 1 \end{bmatrix}}$$

🧮 **calculation सँभालो, ग़लती यहीं होती है** — दूसरी समीकरण में $2X$ है, इसलिए जोड़ने पर $3X$ बनता है; 2 से नहीं, 3 से भाग देना है।

**प्र. 30**  `[1 अंक · 2016 · एक शब्द उत्तरीय प्रश्न]`

**यदि $A = \begin{bmatrix} 4 & 2 & 13 \\ 0 & 5 & 7 \\ 6 & 8 & 9 \end{bmatrix}$ तथा $B = \begin{bmatrix} 2 & 0 & 3 \\ 3 & 10 & 5 \\ 5 & 7 & 0 \end{bmatrix}$ हो, तो $3A - 2B$ का मान ज्ञात कीजिए।**

**उत्तर:** $3A - 2B = \begin{bmatrix} 8 & 6 & 33 \\ -6 & -5 & 11 \\ 8 & 10 & 27 \end{bmatrix}$

दिया है, $A = \begin{bmatrix}4 & 2 & 13\\ 0 & 5 & 7\\ 6 & 8 & 9\end{bmatrix}$ तथा $B = \begin{bmatrix}2 & 0 & 3\\ 3 & 10 & 5\\ 5 & 7 & 0\end{bmatrix}$

अदिश-गुणन करने पर,

$$\begin{aligned}
3A &= \begin{bmatrix}12 & 6 & 39\\ 0 & 15 & 21\\ 18 & 24 & 27\end{bmatrix} \\
2B &= \begin{bmatrix}4 & 0 & 6\\ 6 & 20 & 10\\ 10 & 14 & 0\end{bmatrix}
\end{aligned}$$

संगत अवयव घटाने पर,

$$\begin{aligned}
3A - 2B &= \begin{bmatrix}12-4 & 6-0 & 39-6\\ 0-6 & 15-20 & 21-10\\ 18-10 & 24-14 & 27-0\end{bmatrix}
\end{aligned}$$

$$\therefore\; \boxed{3A - 2B = \begin{bmatrix}8 & 6 & 33\\ -6 & -5 & 11\\ 8 & 10 & 27\end{bmatrix}}$$

**प्र. 31**  `[1 अंक · 2011 · 2009 · योग्यता आधारित प्रश्न (CBQ) · एक शब्द उत्तरीय प्रश्न]`

**यदि $A = \begin{bmatrix} \cos\alpha & \sin\alpha \\ -\sin\alpha & \cos\alpha \end{bmatrix}$, तो सिद्ध कीजिए कि $A^2 = \begin{bmatrix} \cos 2\alpha & \sin 2\alpha \\ -\sin 2\alpha & \cos 2\alpha \end{bmatrix}$**
*अथवा* यदि $A = \begin{bmatrix} \cos\alpha & \sin\alpha \\ -\sin\alpha & \cos\alpha \end{bmatrix}$, तो $A^2$ का मान ज्ञात कीजिए।

**उत्तर:** दिया है, $A = \begin{bmatrix} \cos\alpha & \sin\alpha \\ -\sin\alpha & \cos\alpha \end{bmatrix}$

$$\begin{aligned}
A^2 = A \times A &= \begin{bmatrix} \cos\alpha & \sin\alpha \\ -\sin\alpha & \cos\alpha \end{bmatrix} \times \begin{bmatrix} \cos\alpha & \sin\alpha \\ -\sin\alpha & \cos\alpha \end{bmatrix} \\
&= \begin{bmatrix} \cos\alpha \cdot \cos\alpha + \sin\alpha(-\sin\alpha) & \cos\alpha \cdot \sin\alpha + \sin\alpha \cdot \cos\alpha \\ -\sin\alpha \cdot \cos\alpha + \cos\alpha(-\sin\alpha) & -\sin\alpha \cdot \sin\alpha + \cos\alpha \cdot \cos\alpha \end{bmatrix} \\
&= \begin{bmatrix} \cos^2\alpha - \sin^2\alpha & 2\sin\alpha\cos\alpha \\ -2\sin\alpha\cos\alpha & -\sin^2\alpha + \cos^2\alpha \end{bmatrix} && [\because \sin 2\theta = 2\sin\theta\cos\theta \text{ तथा } \cos 2\theta = \cos^2\theta - \sin^2\theta]
\end{aligned}$$ -----------**[½ अंक]** -----------**[½ अंक]**

$$\therefore\; \boxed{A^2 = \begin{bmatrix} \cos 2\alpha & \sin 2\alpha \\ -\sin 2\alpha & \cos 2\alpha \end{bmatrix}}$$

इति सिद्धम्

#### पुस्तक से

**प्र. 32**  `[1 अंक · एक शब्द उत्तरीय प्रश्न]`

**एक $3 \times 4$ आव्यूह की रचना कीजिए जिसके अवयव $a_{ij} = \frac{1}{2}|-3i + j|$ प्रकार से प्राप्त होते हैं। [NCERT]**

**उत्तर:** चूँकि ज्ञात आव्यूह $3 \times 4$ कोटि का है, अत: अभीष्ट आव्यूह

$$A = \begin{bmatrix} a_{11} & a_{12} & a_{13} & a_{14} \\ a_{21} & a_{22} & a_{23} & a_{24} \\ a_{31} & a_{32} & a_{33} & a_{34} \end{bmatrix}_{3 \times 4}, \text{ जहाँ } a_{ij} = \frac{1}{2}|-3i + j|$$

$i$ तथा $j$ के स्थान पर मान रखने पर आव्यूह $A$ के सभी अवयवों को इस प्रकार ज्ञात करते हैं।

$$\begin{aligned}
a_{11} &= \frac{1}{2}|-3+1| = 1, & a_{12} &= \frac{1}{2}|-3+2| = \frac{1}{2} \\
a_{13} &= \frac{1}{2}|-3+3| = 0, & a_{14} &= \frac{1}{2}|-3+4| = \frac{1}{2} \\
a_{21} &= \frac{1}{2}|-6+1| = \frac{5}{2}, & a_{22} &= \frac{1}{2}|-6+2| = 2 \\
a_{23} &= \frac{1}{2}|-6+3| = \frac{3}{2}, & a_{24} &= \frac{1}{2}|-6+4| = 1 \\
a_{31} &= \frac{1}{2}|-9+1| = 4, & a_{32} &= \frac{1}{2}|-9+2| = \frac{7}{2} \\
a_{33} &= \frac{1}{2}|-9+3| = 3, & a_{34} &= \frac{1}{2}|-9+4| = \frac{5}{2}
\end{aligned}$$

अत: अभीष्ट आव्यूह

$$\therefore\; \boxed{A = \begin{bmatrix} 1 & 1/2 & 0 & 1/2 \\ 5/2 & 2 & 3/2 & 1 \\ 4 & 7/2 & 3 & 5/2 \end{bmatrix}_{3 \times 4}}$$

🎯 **यहीं पर आधा अंक छूट जाता है** — जहाँ कोष्ठक ऋणात्मक बनता है वहाँ $|-3i+j|$ का निरपेक्ष मान लेना है; बिना निरपेक्ष लिए लिखने पर अंक कटता है।

**प्र. 33**  `[1 अंक · एक शब्द उत्तरीय प्रश्न]`

**यदि $A = \begin{bmatrix} 3 & -2 \\ 4 & -2 \end{bmatrix}$ तथा $I = \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix}$ एवं $A^2 = kA - 2I$ हो, तो $k$ ज्ञात कीजिए। [NCERT]**

**उत्तर:** दिया है, $A^2 = kA - 2I$

$$\begin{aligned}
AA &= kA - 2I \\
\begin{bmatrix} 3 & -2 \\ 4 & -2 \end{bmatrix}\begin{bmatrix} 3 & -2 \\ 4 & -2 \end{bmatrix} &= k\begin{bmatrix} 3 & -2 \\ 4 & -2 \end{bmatrix} - 2\begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} \\
\begin{bmatrix} 9-8 & -6+4 \\ 12-8 & -8+4 \end{bmatrix} &= \begin{bmatrix} 3k & -2k \\ 4k & -2k \end{bmatrix} - \begin{bmatrix} 2 & 0 \\ 0 & 2 \end{bmatrix} \\
\begin{bmatrix} 1 & -2 \\ 4 & -4 \end{bmatrix} &= \begin{bmatrix} 3k-2 & -2k \\ 4k & -2k-2 \end{bmatrix}
\end{aligned}$$ -----------**[½ अंक]**

समान आव्यूह के गुणधर्म द्वारा समान आव्यूह के संगत अवयवों को समान रखने पर,

$$3k - 2 = 1 \Rightarrow k = 1$$

इसी प्रकार, अन्य अवयवों की तुलना करने पर,

$$\therefore\; \boxed{k = 1}$$ -----------**[½ अंक]**

### अति लघु उत्तरीय प्रश्न (2 अंक)

#### 2026

#### दिए हुए $A$ तथा $B$ के लिए $(2A-B)$ का मान
**प्र. 34**  `[2 अंक · 2026/set_a_db प्र.22]`  *यही सवाल 1 अंक पर प्र. 25 में*


**यदि $A=\begin{bmatrix}1&2&3\\2&3&1\end{bmatrix}$ तथा $B=\begin{bmatrix}3&-1&3\\-1&0&2\end{bmatrix}$ हैं, तो $(2A-B)$ का मान ज्ञात कीजिए।**

**उत्तर:** दिया है, $A = \begin{bmatrix} 1 & 2 & 3 \\ 2 & 3 & 1 \end{bmatrix}$ तथा $B = \begin{bmatrix} 3 & -1 & 3 \\ -1 & 0 & 2 \end{bmatrix}$

$$2A = \begin{bmatrix} 2 & 4 & 6 \\ 4 & 6 & 2 \end{bmatrix}$$ -----------**[1 अंक]**

$$\begin{aligned}
2A - B &= \begin{bmatrix} 2 & 4 & 6 \\ 4 & 6 & 2 \end{bmatrix} - \begin{bmatrix} 3 & -1 & 3 \\ -1 & 0 & 2 \end{bmatrix} \\
&= \begin{bmatrix} 2-3 & 4+1 & 6-3 \\ 4+1 & 6-0 & 2-2 \end{bmatrix}
\end{aligned}$$

$$\therefore\; \boxed{2A - B = \begin{bmatrix} -1 & 5 & 3 \\ 5 & 6 & 0 \end{bmatrix}}$$ -----------**[1 अंक]**

#### शर्त $A^{2}=A$ पर $(I+A)^{2}-7A$ का सरलीकरण
**प्र. 35**  `[2 अंक · 2026/set_b_dc प्र.15]`

**यदि $A^{2}=A$ हो, तो $(I+A)^{2}-7A$ को सरल कीजिए, जहाँ $A$ एक वर्ग आव्यूह है।**

**उत्तर:**
दिया है, $A^{2}=A$, तथा तत्समक आव्यूह के लिए $IA = AI = A$

$$\begin{aligned}
(I+A)^{2} &= (I+A)(I+A) \\
&= I \cdot I + I \cdot A + A \cdot I + A \cdot A \\
&= I + A + A + A^{2} \\
&= I + 2A + A && [\because A^{2} = A] \\
&= I + 3A
\end{aligned}$$
$$\begin{aligned}
(I+A)^{2} - 7A &= I + 3A - 7A \\
&= I - 4A
\end{aligned}$$

$$\therefore\; \boxed{(I+A)^{2} - 7A = I - 4A}$$

🧮 **calculation सँभालो, ग़लती यहीं होती है** — $(I+A)^{2}$ खोलने पर $IA$ और $AI$ दोनों $A$ ही देते हैं, इसलिए बीच में $2A$ आता है।

#### 2025

#### $A'$ तथा $B$ दिए होने पर $(A+2B)'$ का मान
**प्र. 36**  `[2 अंक · 2025/set_a_ja प्र.27]`

**यदि $A'=\begin{bmatrix}-2 & 3 \\ 1 & 2\end{bmatrix}$ तथा $B=\begin{bmatrix}-1 & 0 \\ 1 & 2\end{bmatrix}$, तो $(A+2B)'$ ज्ञात कीजिए।**

**उत्तर:** दिया है, $A' = \begin{bmatrix} -2 & 3 \\ 1 & 2 \end{bmatrix}$

$$\begin{aligned}
A = (A')' &= \begin{bmatrix} -2 & 3 \\ 1 & 2 \end{bmatrix}' = \begin{bmatrix} -2 & 1 \\ 3 & 2 \end{bmatrix} && [\because (A')' = A] \\
2B &= 2\begin{bmatrix} -1 & 0 \\ 1 & 2 \end{bmatrix} = \begin{bmatrix} -2 & 0 \\ 2 & 4 \end{bmatrix}
\end{aligned}$$ -----------**[1 अंक]**
$$\begin{aligned}
A + 2B &= \begin{bmatrix} -2 & 1 \\ 3 & 2 \end{bmatrix} + \begin{bmatrix} -2 & 0 \\ 2 & 4 \end{bmatrix} = \begin{bmatrix} -4 & 1 \\ 5 & 6 \end{bmatrix} \\
(A + 2B)' &= \begin{bmatrix} -4 & 1 \\ 5 & 6 \end{bmatrix}'
\end{aligned}$$

$$\therefore\; \boxed{(A + 2B)' = \begin{bmatrix} -4 & 5 \\ 1 & 6 \end{bmatrix}}$$ -----------**[1 अंक]**

#### $(A')'\cdot B$ का गुणनफल सिद्ध करना
**प्र. 37**  `[2 अंक · 2025/set_c_jc प्र.24]`

**यदि $A=\begin{bmatrix}3&\sqrt{3}&2\\4&2&0\end{bmatrix}$ तथा $B=\begin{bmatrix}0&\frac{1}{4}\\0&0\\\frac{1}{2}&\frac{1}{8}\end{bmatrix}$, तब सिद्ध कीजिए कि $(A')'\cdot B=\begin{bmatrix}1&1\\0&1\end{bmatrix}$।**

**उत्तर:** दिया गया है, $A = \begin{bmatrix} 3 & \sqrt{3} & 2 \\ 4 & 2 & 0 \end{bmatrix}$ तथा $B = \begin{bmatrix} 0 & 1/4 \\ 0 & 0 \\ 1/2 & 1/8 \end{bmatrix}$

हम जानते हैं, $(A')' = A$

$$\begin{aligned}
\text{बायाँ पक्ष} = (A')' \cdot B = AB &= \begin{bmatrix} 3 & \sqrt{3} & 2 \\ 4 & 2 & 0 \end{bmatrix}\begin{bmatrix} 0 & 1/4 \\ 0 & 0 \\ 1/2 & 1/8 \end{bmatrix} \\
&= \begin{bmatrix} 0+0+1 & 3/4+0+1/4 \\ 0+0+0 & 1+0+0 \end{bmatrix} \\
&= \begin{bmatrix} 1 & 1 \\ 0 & 1 \end{bmatrix} = \text{दायाँ पक्ष}
\end{aligned}$$ -----------**[1 अंक]** -----------**[1 अंक]**

$$\therefore\; \boxed{(A')' \cdot B = \begin{bmatrix} 1 & 1 \\ 0 & 1 \end{bmatrix}}$$

#### घूर्णन आव्यूह पर $A'A=I$ का सत्यापन
**प्र. 38**  `[2 अंक · 2025/set_b_jb प्र.27]`

**यदि $A=\begin{bmatrix}\cos \alpha & \sin \alpha \\ -\sin \alpha & \cos \alpha\end{bmatrix}$, तो सत्यापित कीजिए कि $A'A=I$।**

**उत्तर:** $A = \begin{bmatrix} \cos\alpha & \sin\alpha \\ -\sin\alpha & \cos\alpha \end{bmatrix}$

$$A' = \begin{bmatrix} \cos\alpha & -\sin\alpha \\ \sin\alpha & \cos\alpha \end{bmatrix}$$

$$\begin{aligned}
\text{बायाँ पक्ष} = A'A &= \begin{bmatrix} \cos\alpha & -\sin\alpha \\ \sin\alpha & \cos\alpha \end{bmatrix}\begin{bmatrix} \cos\alpha & \sin\alpha \\ -\sin\alpha & \cos\alpha \end{bmatrix} \\
&= \begin{bmatrix} \cos^2\alpha + \sin^2\alpha & \cos\alpha\sin\alpha - \sin\alpha\cos\alpha \\ \sin\alpha\cos\alpha - \sin\alpha\cos\alpha & \sin^2\alpha + \cos^2\alpha \end{bmatrix} \\
&= \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} = I = \text{दायाँ पक्ष}
\end{aligned}$$

$$\therefore\; \boxed{A'A = I}$$

इति सिद्धम्
⚠ **स्रोत-नोट:** पुस्तक के इस हल में ऊपरी-दायाँ अवयव $\cos\alpha\sin\alpha - \cos\alpha\sin x$ छपा है, जो छपाई की भूल है; ऊपर की पंक्ति में सही रूप $\sin\alpha\cos\alpha$ लिखा गया है। कॉपी में भी यही लिखिए।

#### 2024

#### अदिश-गुणन वाली आव्यूह-समानता से $x$ तथा $y$ के मान
**प्र. 39**  `[2 अंक · 2024/set_a_fa प्र.21 · 2020/set_b_xd प्र.15]`  *2020 में भी आया था*  *यही सवाल 1 अंक पर प्र. 23 में*

**$x$ तथा $y$ ज्ञात कीजिए यदि $2\begin{bmatrix}1&3\\0&x\end{bmatrix}+\begin{bmatrix}y&0\\1&2\end{bmatrix}=\begin{bmatrix}5&6\\1&8\end{bmatrix}$।**

**उत्तर:** दिया है, $2\begin{bmatrix} 1 & 3 \\ 0 & x \end{bmatrix} + \begin{bmatrix} y & 0 \\ 1 & 2 \end{bmatrix} = \begin{bmatrix} 5 & 6 \\ 1 & 8 \end{bmatrix}$

$$\begin{aligned}
\begin{bmatrix} 2+y & 6+0 \\ 0+1 & 2x+2 \end{bmatrix} &= \begin{bmatrix} 5 & 6 \\ 1 & 8 \end{bmatrix} \\
\begin{bmatrix} 2+y & 6 \\ 1 & 2x+2 \end{bmatrix} &= \begin{bmatrix} 5 & 6 \\ 1 & 8 \end{bmatrix}
\end{aligned}$$

समान आव्यूह की परिभाषा से, हम जानते हैं कि ज्ञात आव्यूह समान हैं, तो इनके संगत अवयव भी समान होंगे। अतः संगत अवयवों को समान रखने पर,

$$\begin{aligned}
2 + y &= 5 && \text{...(i)} \\
2x + 2 &= 8 && \text{...(ii)}
\end{aligned}$$ -----------**[1 अंक]**

समी (i) व (ii) से,

$$\begin{aligned}
y &= 5 - 2 = 3 \\
2x &= 8 - 2 \\
x &= \frac{6}{2} = 3
\end{aligned}$$

$$\therefore\; \boxed{x = 3,\ y = 3}$$ -----------**[1 अंक]**

#### गुणनफल $AB$ तथा $BA$, जहाँ $A=\begin{bmatrix}1 & -2 & 3 \\ -4 & 2 & 5\end{bmatrix}$
**प्र. 40**  `[2 अंक · 2024/set_d_fd प्र.22]`


**यदि $A=\begin{bmatrix}1 & -2 & 3 \\ -4 & 2 & 5\end{bmatrix}$ और $B=\begin{bmatrix}2 & 3 \\ 4 & 5 \\ 2 & 1\end{bmatrix}$ है तो $AB$ तथा $BA$ ज्ञात कीजिए।**

**उत्तर:** क्योंकि $A$ एक $2 \times 3$ आव्यूह है और $B$ एक $3 \times 2$ आव्यूह है, इसलिए $AB$ तथा $BA$ दोनों ही परिभाषित हैं तथा क्रमशः $2 \times 2$ तथा $3 \times 3$ कोटियों के आव्यूह हैं।

$$\begin{aligned}
AB &= \begin{bmatrix} 1 & -2 & 3 \\ -4 & 2 & 5 \end{bmatrix} \times \begin{bmatrix} 2 & 3 \\ 4 & 5 \\ 2 & 1 \end{bmatrix} \\
&= \begin{bmatrix} 2-8+6 & 3-10+3 \\ -8+8+10 & -12+10+5 \end{bmatrix}
\end{aligned}$$

और

$$\begin{aligned}
BA &= \begin{bmatrix}2 & 3\\ 4 & 5\\ 2 & 1\end{bmatrix}\begin{bmatrix}1 & -2 & 3\\ -4 & 2 & 5\end{bmatrix} \\
&= \begin{bmatrix}2-12 & -4+6 & 6+15\\ 4-20 & -8+10 & 12+25\\ 2-4 & -4+2 & 6+5\end{bmatrix}
\end{aligned}$$

$$\therefore\; \boxed{AB = \begin{bmatrix} 0 & -4 \\ 10 & 3 \end{bmatrix}},\ \boxed{BA = \begin{bmatrix}-10 & 2 & 21\\ -16 & 2 & 37\\ -2 & -2 & 11\end{bmatrix}}$$

🎯 **यहीं पर आधा अंक छूट जाता है** — $AB$ और $BA$ दोनों पूछे गए हैं; एक निकालकर रुक जाने पर आधे अंक वहीं रह जाते हैं।

#### 2023

#### स्तम्भ-आव्यूहों की समानता से $x$, $y$ तथा $z$ के मान
**प्र. 41**  `[2 अंक · 2023/set_b_bd प्र.21]`

**यदि $\begin{bmatrix} x+z \\ y+z \\ x+y+z \end{bmatrix} = \begin{bmatrix} 5 \\ 7 \\ 9 \end{bmatrix}$ है, तो $x$, $y$ तथा $z$ का मान ज्ञात कीजिए।**

**उत्तर:** दिया है, $\begin{bmatrix} x+z \\ y+z \\ x+y+z \end{bmatrix} = \begin{bmatrix} 5 \\ 7 \\ 9 \end{bmatrix}$

दोनों पक्षों की तुलना करने पर,

$$\begin{aligned}
x + z &= 5 && \text{...(i)} \\
y + z &= 7 && \text{...(ii)} \\
x + y + z &= 9 && \text{...(iii)}
\end{aligned}$$

समी (ii) व (iii) से,

$$x + 7 = 9 \Rightarrow x = 9 - 7 = 2$$ -----------**[1 अंक]**

$x$ का मान समी (i) में रखने पर, $2 + z = 5 \Rightarrow z = 5 - 2 = 3$

$z$ का मान समी (ii) में रखने पर, $y + 3 = 7 \Rightarrow y = 7 - 3 = 4$

$$\therefore\; \boxed{x = 2,\ y = 4,\ z = 3}$$ -----------**[1 अंक]**

#### घूर्णन आव्यूह की तीसरी घात $A^{3}$ की उपपत्ति
**प्र. 42**  `[2 अंक · 2023/set_c_ax प्र.18]`

**यदि $A=\begin{bmatrix}\cos\theta & \sin\theta \\ -\sin\theta & \cos\theta\end{bmatrix}$, तो सिद्ध कीजिए कि $A^{3}=\begin{bmatrix}\cos3\theta & \sin3\theta \\ -\sin3\theta & \cos3\theta\end{bmatrix}$।**

**उत्तर:** दिया है, $A = \begin{bmatrix} \cos\theta & \sin\theta \\ -\sin\theta & \cos\theta \end{bmatrix}$

$$\begin{aligned}
A^2 = A \cdot A &= \begin{bmatrix} \cos\theta & \sin\theta \\ -\sin\theta & \cos\theta \end{bmatrix}\begin{bmatrix} \cos\theta & \sin\theta \\ -\sin\theta & \cos\theta \end{bmatrix} \\
&= \begin{bmatrix} \cos^2\theta - \sin^2\theta & \sin\theta\cos\theta + \sin\theta\cos\theta \\ -\sin\theta\cos\theta - \sin\theta\cos\theta & -\sin^2\theta + \cos^2\theta \end{bmatrix} \\
&= \begin{bmatrix} \cos 2\theta & \sin 2\theta \\ -\sin 2\theta & \cos 2\theta \end{bmatrix} && [\because \cos^2 A - \sin^2 A = \cos 2A \text{ तथा } 2\sin A\cos A = \sin 2A]
\end{aligned}$$
$$\begin{aligned}
A^3 = A^2 \cdot A &= \begin{bmatrix} \cos 2\theta & \sin 2\theta \\ -\sin 2\theta & \cos 2\theta \end{bmatrix}\begin{bmatrix} \cos\theta & \sin\theta \\ -\sin\theta & \cos\theta \end{bmatrix} \\
&= \begin{bmatrix} \cos 2\theta\cos\theta - \sin 2\theta\sin\theta & \cos 2\theta\sin\theta + \sin 2\theta\cos\theta \\ -\sin 2\theta\cos\theta - \sin\theta\cos 2\theta & -\sin 2\theta\sin\theta + \cos 2\theta\cos\theta \end{bmatrix} \\
&= \begin{bmatrix} \cos(2\theta+\theta) & \sin(2\theta+\theta) \\ -\sin(2\theta+\theta) & \cos(2\theta+\theta) \end{bmatrix} && [\because \cos A\cos B - \sin A\sin B = \cos(A+B) \text{ तथा } \sin A\cos B + \cos A\sin B = \sin(A+B)]
\end{aligned}$$

$$\therefore\; \boxed{A^3 = \begin{bmatrix} \cos 3\theta & \sin 3\theta \\ -\sin 3\theta & \cos 3\theta \end{bmatrix}}$$

इति सिद्धम्

#### $n$ कोटि के व्युत्क्रमणीय आव्यूहों पर $(AB)^{-1}=B^{-1}A^{-1}$ की उपपत्ति
**प्र. 43**  `[2 अंक · 2023/set_d_ay प्र.24]`  *यही सवाल 5 अंक पर प्र. 66 में*

**यदि $A$ तथा $B$ दो व्युत्क्रमणीय आव्यूह कोटि $n$ के हैं तो सिद्ध कीजिए कि $(AB)^{-1}=B^{-1}.A^{-1}$।**

**उत्तर:** दिया है $A$ तथा $B$ व्युत्क्रमणीय वर्ग आव्यूह हैं। सिद्ध करना है $(AB)^{-1} = B^{-1}A^{-1}$

गुणन के साहचर्य नियम से,

$$\begin{aligned}
AB(B^{-1}A^{-1}) &= A(BB^{-1})A^{-1} = AIA^{-1} && [\because BB^{-1} = I] \\
&= AA^{-1} && [\because AI = A] \\
&= I && \text{...(i)}
\end{aligned}$$ -----------**[1 अंक]**

इसी प्रकार,

$$\begin{aligned}
(B^{-1}A^{-1})AB &= B^{-1}(A^{-1}A)B = B^{-1}IB && [\because A^{-1}A = I] \\
&= B^{-1}B = I && [\because IB = B]
\end{aligned}$$

$$AB(B^{-1}A^{-1}) = (B^{-1}A^{-1})AB = I \quad \text{...(ii)}$$

समी (i) तथा (ii) से, $AB(B^{-1}A^{-1}) = I = (B^{-1}A^{-1})AB$

अत: $B^{-1}A^{-1},\ AB$ का व्युत्क्रम है।

$$\therefore\; \boxed{(AB)^{-1} = B^{-1}A^{-1}}$$ -----------**[1 अंक]**

इति सिद्धम्

#### 2022

#### गुणनफल $AB$ तथा $BA$, जहाँ $A=\begin{bmatrix}1&2&3\\-4&2&5\end{bmatrix}$
**प्र. 44**  `[2 अंक · 2022/set_a_ff प्र.23]`

**यदि $A=\begin{bmatrix}1&2&3\\-4&2&5\end{bmatrix}$ तथा $B=\begin{bmatrix}2&3\\4&5\\3&1\end{bmatrix}$, तो $AB$ तथा $BA$ का मान ज्ञात कीजिए।**

**उत्तर:** दिया है, $A = \begin{bmatrix} 1 & 2 & 3 \\ -4 & 2 & 5 \end{bmatrix}$ तथा $B = \begin{bmatrix} 2 & 3 \\ 4 & 5 \\ 3 & 1 \end{bmatrix}$

$$\begin{aligned}
AB &= \begin{bmatrix} 1 & 2 & 3 \\ -4 & 2 & 5 \end{bmatrix}\begin{bmatrix} 2 & 3 \\ 4 & 5 \\ 3 & 1 \end{bmatrix} \\
&= \begin{bmatrix} 2+8+9 & 3+10+3 \\ -8+8+15 & -12+10+5 \end{bmatrix} = \begin{bmatrix} 19 & 16 \\ 15 & 3 \end{bmatrix}
\end{aligned}$$ -----------**[1 अंक]**
$$\begin{aligned}
BA &= \begin{bmatrix} 2 & 3 \\ 4 & 5 \\ 3 & 1 \end{bmatrix}\begin{bmatrix} 1 & 2 & 3 \\ -4 & 2 & 5 \end{bmatrix} \\
&= \begin{bmatrix} 2-12 & 4+6 & 6+15 \\ 4-20 & 8+10 & 12+25 \\ 3-4 & 6+2 & 9+5 \end{bmatrix}
\end{aligned}$$

$$\therefore\; \boxed{AB = \begin{bmatrix} 19 & 16 \\ 15 & 3 \end{bmatrix}},\ \boxed{BA = \begin{bmatrix} -10 & 10 & 21 \\ -16 & 18 & 37 \\ -1 & 8 & 14 \end{bmatrix}}$$ -----------**[1 अंक]**

#### 2020

#### $3\times3$ त्रिकोणमितीय आव्यूह पर $F(x+y)=F(x)\cdot F(y)$ की उपपत्ति
**प्र. 45**  `[2 अंक · 2020/set_c_xc प्र.16]`

**यदि $F(x)=\begin{bmatrix}\cos x & -\sin x & 0 \\ -\sin x & \cos x & 0 \\ 0 & 0 & 1\end{bmatrix}$ है, तो सिद्ध कीजिए कि $F(x+y)=F(x)\cdot F(y)$।**

⚠️ पेपर में $F(x)$ की दूसरी पंक्ति $-\sin x\ \ \cos x\ \ 0$ छपी है। इस आव्यूह पर $F(x)\cdot F(y)$ के विकर्ण-अवयव $\cos(x-y)$ बनते हैं, $\cos(x+y)$ नहीं, इसलिए छपा हुआ परिणाम छपे हुए आँकड़ों से निकलता ही नहीं। प्रश्न जैसा छपा है वैसा ही रखा गया है।

**उत्तर:** *(छपे हुए प्रश्न पर हल सम्भव नहीं; नीचे देखिए)*
⚠ **अपूर्ण:** इस प्रश्न का हल यहाँ नहीं दिया जा सकता, क्योंकि पेपर में छपे $F(x)$ पर माँगी गई सर्वसमिका सिद्ध होती ही नहीं (ऊपर वाला नोट देखिए); इसीलिए पुस्तक के इस भाग में भी इसका उत्तर नहीं है। ठीक यही प्रश्न, सही $F(x)$ और पूरे हल के साथ, प्र. 47 पर है; उसी को पढ़िए।

#### पुराने वर्ष

> साल पुस्तक के दर्ज किए हैं, सेट-कोड नहीं।

**प्र. 46**  `[2 अंक · 2025 · 2018 · NCERT · अति लघु उत्तरीय प्रश्न]`

**निम्नलिखित समीकरण से $x, y$ तथा $z$ के मान ज्ञात कीजिए।**

$$\begin{bmatrix} x+y & 2 \\ 5+z & xy \end{bmatrix} = \begin{bmatrix} 6 & 2 \\ 5 & 8 \end{bmatrix}$$

**उत्तर:** दिया है, $\begin{bmatrix} x+y & 2 \\ 5+z & xy \end{bmatrix} = \begin{bmatrix} 6 & 2 \\ 5 & 8 \end{bmatrix}$

समान आव्यूह की परिभाषा से, हम जानते हैं कि ज्ञात आव्यूह समान हैं, तो उसके संगत अवयव भी बराबर होंगे। अतः संगत अवयवों की तुलना करने पर,

$$\begin{aligned}
x + y &= 6 && \text{...(i)} \\
5 + z &= 5 && \text{...(ii)} \\
xy &= 8 && \text{...(iii)}
\end{aligned}$$

समी (ii) से, $z = 0$; समी (i) से, $y = 6 - x$ ...(iv) -----------**[1 अंक]**

$y$ का मान समी (iii) में रखने पर,

$$\begin{aligned}
x(6-x) &= 8 \\
x^2 - 6x + 8 &= 0 \\
(x-2)(x-4) &= 0 \\
x &= 2 \text{ या } x = 4
\end{aligned}$$

जब $x = 2$, तब समी (iv) से, $y = 6 - 2 = 4$ तथा जब $x = 4$, तब समी (iv) से, $y = 6 - 4 = 2$

$$\therefore\; \boxed{x = 2,\ y = 4,\ z = 0} \text{ अथवां } \boxed{x = 4,\ y = 2,\ z = 0}$$ -----------**[1 अंक]**

🎯 **यहीं पर आधा अंक छूट जाता है** — $x$ के दो मान निकलते हैं, इसलिए दोनों जोड़े लिखने हैं; एक जोड़ा छोड़ा तो उत्तर अधूरा है।

**प्र. 47**  `[2 अंक · 2025 · 2020 · अति लघु उत्तरीय प्रश्न]`  *यही सवाल 8 अंक पर प्र. 77 में*

**$F(x) = \left[\begin{array}{ccc} \cos x & -\sin x & 0 \\ \sin x & \cos x & 0 \\ 0 & 0 & 1 \end{array}\right]$ है, तो सिद्ध कीजिए कि**

$$F(x) \cdot F(y) = F(x+y)$$

**उत्तर:** बायाँ पक्ष $= F(x) \cdot F(y)$

$$F(x) \cdot F(y) = \begin{bmatrix} \cos x & -\sin x & 0 \\ \sin x & \cos x & 0 \\ 0 & 0 & 1 \end{bmatrix}\begin{bmatrix} \cos y & -\sin y & 0 \\ \sin y & \cos y & 0 \\ 0 & 0 & 1 \end{bmatrix}$$

गुणनफल का हर अवयव अलग-अलग,

$$\begin{aligned}
C_{11} &= \cos x \cos y - \sin x \sin y + 0 = \cos(x+y) \\
C_{12} &= -\cos x \sin y - \sin x \cos y + 0 = -\sin(x+y) \\
C_{21} &= \sin x \cos y + \cos x \sin y + 0 = \sin(x+y) \\
C_{22} &= -\sin x \sin y + \cos x \cos y + 0 = \cos(x+y) \\
C_{13} = C_{23} = C_{31} = C_{32} &= 0+0+0 = 0 \\
C_{33} &= 0+0+1 = 1
\end{aligned}$$

$$F(x) \cdot F(y) = \begin{bmatrix} \cos(x+y) & -\sin(x+y) & 0 \\ \sin(x+y) & \cos(x+y) & 0 \\ 0 & 0 & 1 \end{bmatrix} = F(x+y) = \text{दायाँ पक्ष}$$

$$\therefore\; \boxed{F(x) \cdot F(y) = F(x+y)}$$

इति सिद्धम्

**प्र. 48**  `[2 अंक · 2025 · 2018 · NCERT · अति लघु उत्तरीय प्रश्न]`  *यही सवाल 5 अंक पर प्र. 64 में*

**यदि $A = \begin{bmatrix} 0 & -\tan \alpha/2 \\ \tan \alpha/2 & 0 \end{bmatrix}$ तथा $I$ कोटि 2 का एक तत्समक् आव्यूह है, तो सिद्ध कीजिए कि**

$$I + A = (I - A)\begin{bmatrix} \cos \alpha & -\sin \alpha \\ \sin \alpha & \cos \alpha \end{bmatrix}$$

**उत्तर:** यहाँ, $A = \begin{bmatrix} 0 & -t \\ t & 0 \end{bmatrix}$, जहाँ $t = \tan\left(\frac{\alpha}{2}\right)$

$$\begin{aligned}
\cos \alpha &= \frac{1 - \tan^2\left(\frac{\alpha}{2}\right)}{1 + \tan^2\left(\frac{\alpha}{2}\right)} = \frac{1 - t^2}{1 + t^2} \\
\sin \alpha &= \frac{2\tan\left(\frac{\alpha}{2}\right)}{1 + \tan^2\left(\frac{\alpha}{2}\right)} = \frac{2t}{1 + t^2}
\end{aligned}$$
$$\begin{aligned}
\text{दायाँ पक्ष} &= (I - A)\begin{bmatrix} \cos \alpha & -\sin \alpha \\ \sin \alpha & \cos \alpha \end{bmatrix} \\
&= \left(\begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} - \begin{bmatrix} 0 & -t \\ +t & 0 \end{bmatrix}\right)\begin{bmatrix} \frac{1-t^2}{1+t^2} & \frac{-2t}{1+t^2} \\ \frac{2t}{1+t^2} & \frac{1-t^2}{1+t^2} \end{bmatrix} \\
&= \begin{bmatrix} 1 & t \\ -t & 1 \end{bmatrix}\begin{bmatrix} \frac{1-t^2}{1+t^2} & \frac{-2t}{1+t^2} \\ \frac{2t}{1+t^2} & \frac{1-t^2}{1+t^2} \end{bmatrix} \\
&= \begin{bmatrix} \frac{1-t^2+2t^2}{1+t^2} & \frac{-2t+t(1-t^2)}{1+t^2} \\ \frac{-t(1-t^2)+2t}{1+t^2} & \frac{2t^2+1-t^2}{1+t^2} \end{bmatrix} \\
&= \begin{bmatrix} \frac{1+t^2}{1+t^2} & \frac{-t(1+t^2)}{1+t^2} \\ \frac{t(1+t^2)}{1+t^2} & \frac{1+t^2}{1+t^2} \end{bmatrix} = \begin{bmatrix} 1 & -t \\ t & 1 \end{bmatrix} \\
&= \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} + \begin{bmatrix} 0 & -t \\ t & 0 \end{bmatrix} \\
&= \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} + \begin{bmatrix} 0 & -\tan(\alpha/2) \\ \tan(\alpha/2) & 0 \end{bmatrix} = I + A = \text{बायाँ पक्ष}
\end{aligned}$$

$$\therefore\; \boxed{I + A = (I - A)\begin{bmatrix} \cos \alpha & -\sin \alpha \\ \sin \alpha & \cos \alpha \end{bmatrix}}$$

इति सिद्धम्
⚠ **स्रोत-नोट:** पुस्तक के इस हल की अंतिम-से-पूर्व पंक्ति में नीचे-बाएँ अवयव का हर $1+t$ छपा है, जो छपाई की भूल है; ऊपर की पंक्ति में सही हर $1+t^2$ लिखा गया है। कॉपी में भी यही लिखिए।

**प्र. 49**  `[2 अंक · 2022 · अति लघु उत्तरीय प्रश्न]`

**यदि $A = \left[\begin{array}{ll} 6 & 9 \\ 2 & 3 \end{array}\right]$ तथा $B = \left[\begin{array}{lll} 2 & 5 & 0 \\ 7 & 8 & 9 \end{array}\right]$, तो $AB$ ज्ञात कीजिए।**

**उत्तर:** दिया है, $A = \begin{bmatrix} 6 & 9 \\ 2 & 3 \end{bmatrix}$ तथा $B = \begin{bmatrix} 2 & 5 & 0 \\ 7 & 8 & 9 \end{bmatrix}$

$$\begin{aligned}
AB &= \begin{bmatrix} 6 & 9 \\ 2 & 3 \end{bmatrix}\begin{bmatrix} 2 & 5 & 0 \\ 7 & 8 & 9 \end{bmatrix} \\
&= \begin{bmatrix} 12+63 & 30+72 & 0+81 \\ 4+21 & 10+24 & 0+27 \end{bmatrix}
\end{aligned}$$ -----------**[1 अंक]**

$$\therefore\; \boxed{AB = \begin{bmatrix} 75 & 102 & 81 \\ 25 & 34 & 27 \end{bmatrix}}$$ -----------**[1 अंक]**

**प्र. 50**  `[2 अंक · 2022 · 2018 · 2017 · 2016 · अति लघु उत्तरीय प्रश्न]`  *यही सवाल 8 अंक पर प्र. 83 में*

**यदि $\begin{bmatrix} x & -5 & -1 \end{bmatrix}\begin{bmatrix} 1 & 0 & 2 \\ 0 & 2 & 1 \\ 2 & 0 & 3 \end{bmatrix}\begin{bmatrix} x \\ 4 \\ 1 \end{bmatrix} = 0$, तो $x$ का मान ज्ञात कीजिए।**

**उत्तर:** दिया है, $\begin{bmatrix} x & -5 & -1 \end{bmatrix}\begin{bmatrix} 1 & 0 & 2 \\ 0 & 2 & 1 \\ 2 & 0 & 3 \end{bmatrix}\begin{bmatrix} x \\ 4 \\ 1 \end{bmatrix} = 0$

पहले गुणनफल का हर अवयव अलग-अलग,

$$\begin{aligned}
C_{11} &= x \times 1 + (-5) \times 0 + (-1) \times 2 = x - 2 \\
C_{12} &= x \times 0 + (-5) \times 2 + (-1) \times 0 = -10 \\
C_{13} &= x \times 2 + (-5) \times 1 + (-1) \times 3 = 2x - 8
\end{aligned}$$

$$\begin{bmatrix} x - 2 & -10 & 2x - 8 \end{bmatrix}\begin{bmatrix} x \\ 4 \\ 1 \end{bmatrix} = 0$$ -----------**[1 अंक]**

$$\begin{aligned}
(x - 2) \times x + (-10) \times 4 + (2x - 8) \times 1 &= 0 \\
x^2 - 2x - 40 + 2x - 8 &= 0 \\
x^2 &= 48 \\
x &= \pm\sqrt{48}
\end{aligned}$$

$$\therefore\; \boxed{x = \pm 4\sqrt{3}}$$ -----------**[1 अंक]**

🎯 **यहीं पर आधा अंक छूट जाता है** — वर्गमूल लेने पर दोनों चिह्न लिखो, $x = \pm 4\sqrt{3}$; एक चिह्न छोड़ने पर अंक कटता है।

**प्र. 51**  `[2 अंक · 2020 · अति लघु उत्तरीय प्रश्न]`

**यदि $A$ तथा $B$ दो सममित आव्यूह हैं, तो सिद्ध कीजिए कि $(AB - BA)$ एक विषम सममित आव्यूह होगा।**

**उत्तर:** दिया है, $A$ तथा $B$ दो सममित आव्यूह हैं।

$$A' = A \text{ तथा } B' = B \qquad \text{...(i)}$$

अब,

$$\begin{aligned}
(AB - BA)' &= (AB)' - (BA)' = B'A' - A'B' \\
&= BA - AB && \text{[समी (i) से]} \\
&= -(AB - BA)
\end{aligned}$$ -----------**[1 अंक]** -----------**[1 अंक]**

अत:

$$\therefore\; \boxed{(AB - BA) \text{ एक विषम सममित आव्यूह है।}}$$

🧠 **पूरा जवाब इसी एक लाइन में है** — परिवर्त लेते ही गुणनफल का क्रम उलट जाता है, और वही $-(AB-BA)$ बना देता है।

**प्र. 52**  `[2 अंक · 2018 · 2017 · NCERT · अति लघु उत्तरीय प्रश्न]`


**यदि $A = \left[\begin{array}{rr} 0 & -1 \\ 0 & 2 \end{array}\right]$ तथा $B = \left[\begin{array}{ll} 3 & 5 \\ 0 & 0 \end{array}\right]$, तो $AB$ तथा $BA$ ज्ञात कीजिए।**

**उत्तर:**

$$\begin{aligned}
AB &= \begin{bmatrix}0 & -1\\ 0 & 2\end{bmatrix}\begin{bmatrix}3 & 5\\ 0 & 0\end{bmatrix} \\
&= \begin{bmatrix}0+0 & 0+0\\ 0+0 & 0+0\end{bmatrix}
\end{aligned}$$

$AB = \begin{bmatrix} 0 & 0 \\ 0 & 0 \end{bmatrix}$ तथा $BA = \begin{bmatrix} 0 & 7 \\ 0 & 0 \end{bmatrix}$

$BA$ में पहले $B$ की पंक्ति और फिर $A$ का स्तम्भ लिया जाता है,

$$\begin{aligned}
BA &= \begin{bmatrix}3 & 5\\ 0 & 0\end{bmatrix}\begin{bmatrix}0 & -1\\ 0 & 2\end{bmatrix} \\
&= \begin{bmatrix}0+0 & -3+10\\ 0+0 & 0+0\end{bmatrix}
\end{aligned}$$

$$\therefore\; \boxed{AB = \begin{bmatrix}0 & 0\\ 0 & 0\end{bmatrix}\ \text{ तथा }\ BA = \begin{bmatrix}0 & 7\\ 0 & 0\end{bmatrix}}$$

**प्र. 53**  `[2 अंक · 2018 · अति लघु उत्तरीय प्रश्न]`

**यदि $A = \left[\begin{array}{rr} 1 & -1 \\ -1 & 1 \end{array}\right]$, तो सिद्ध कीजिए कि $A^3 = 4A$**

**उत्तर:** दिया है, $A = \begin{bmatrix} 1 & -1 \\ -1 & 1 \end{bmatrix}$

$$\begin{aligned}
A^2 = A \cdot A &= \begin{bmatrix} 1 & -1 \\ -1 & 1 \end{bmatrix}\begin{bmatrix} 1 & -1 \\ -1 & 1 \end{bmatrix} = \begin{bmatrix} 1+1 & -1-1 \\ -1-1 & 1+1 \end{bmatrix} \\
&= \begin{bmatrix} 2 & -2 \\ -2 & 2 \end{bmatrix}
\end{aligned}$$ -----------**[1 अंक]**

अब,

$$\begin{aligned}
A^3 = A^2 \cdot A &= \begin{bmatrix} 2 & -2 \\ -2 & 2 \end{bmatrix}\begin{bmatrix} 1 & -1 \\ -1 & 1 \end{bmatrix} = \begin{bmatrix} 2+2 & -2-2 \\ -2-2 & 2+2 \end{bmatrix} \\
&= \begin{bmatrix} 4 & -4 \\ -4 & 4 \end{bmatrix} = 4\begin{bmatrix} 1 & -1 \\ -1 & 1 \end{bmatrix}
\end{aligned}$$

$$\therefore\; \boxed{A^3 = 4A}$$ -----------**[1 अंक]**

इति सिद्धम्

**प्र. 54**  `[2 अंक · 2018 · 2017 · अति लघु उत्तरीय प्रश्न]`

**यदि आव्यूह $A = \begin{bmatrix} 1 & -1 \\ 2 & 3 \end{bmatrix}$ हो, तो सिद्ध कीजिए कि $A^2 - 4A + 5I = 0$, यहाँ $I$ इकाई आव्यूह है।**

**उत्तर:**
दिया है, $A = \begin{bmatrix}1 & -1\\ 2 & 3\end{bmatrix}$ तथा $I = \begin{bmatrix}1 & 0\\ 0 & 1\end{bmatrix}$

$$\begin{aligned}
A^{2} = A \cdot A &= \begin{bmatrix}1 & -1\\ 2 & 3\end{bmatrix}\begin{bmatrix}1 & -1\\ 2 & 3\end{bmatrix} \\
&= \begin{bmatrix}1-2 & -1-3\\ 2+6 & -2+9\end{bmatrix} \\
&= \begin{bmatrix}-1 & -4\\ 8 & 7\end{bmatrix}
\end{aligned}$$

अब अदिश-गुणन करने पर,

$$\begin{aligned}
4A &= \begin{bmatrix}4 & -4\\ 8 & 12\end{bmatrix} \\
5I &= \begin{bmatrix}5 & 0\\ 0 & 5\end{bmatrix}
\end{aligned}$$

संगत अवयव जोड़ने-घटाने पर,

$$\begin{aligned}
A^{2} - 4A + 5I &= \begin{bmatrix}-1 & -4\\ 8 & 7\end{bmatrix} - \begin{bmatrix}4 & -4\\ 8 & 12\end{bmatrix} + \begin{bmatrix}5 & 0\\ 0 & 5\end{bmatrix} \\
&= \begin{bmatrix}-1-4+5 & -4+4+0\\ 8-8+0 & 7-12+5\end{bmatrix} \\
&= \begin{bmatrix}0 & 0\\ 0 & 0\end{bmatrix} = O
\end{aligned}$$

$$\therefore\; \boxed{A^{2} - 4A + 5I = O}$$

इति सिद्धम्

🧮 **calculation सँभालो, ग़लती यहीं होती है** — $5I$ में 5 सिर्फ़ विकर्ण पर आता है; हर अवयव में 5 जोड़ देने पर शून्य आव्यूह नहीं बनेगा।

**प्र. 55**  `[2 अंक · 2018 · NCERT · अति लघु उत्तरीय प्रश्न]`

**$A$ तथा $B$ आव्यूहों के लिए सत्यापित कीजिए कि $(AB)' = B'A'$, जहाँ $A = \begin{bmatrix} 1 \\ -4 \\ 3 \end{bmatrix}$, तथा $B = \begin{bmatrix} -1 & 2 & 1 \end{bmatrix}$**

**उत्तर:** यहाँ,

$$AB = \begin{bmatrix} 1 \\ -4 \\ 3 \end{bmatrix}\begin{bmatrix} -1 & 2 & 1 \end{bmatrix} = \begin{bmatrix} -1 & 2 & 1 \\ 4 & -8 & -4 \\ -3 & 6 & 3 \end{bmatrix}$$

$$(AB)' = \begin{bmatrix} -1 & 2 & 1 \\ 4 & -8 & -4 \\ -3 & 6 & 3 \end{bmatrix}' = \begin{bmatrix} -1 & 4 & -3 \\ 2 & -8 & 6 \\ 1 & -4 & 3 \end{bmatrix} \qquad \text{...(i)}$$ -----------**[1 अंक]**

तथा

$$\begin{aligned}
B'A' &= \begin{bmatrix} -1 & 2 & 1 \end{bmatrix}'\begin{bmatrix} 1 \\ -4 \\ 3 \end{bmatrix}' = \begin{bmatrix} -1 \\ 2 \\ 1 \end{bmatrix}\begin{bmatrix} 1 & -4 & 3 \end{bmatrix} \\
&= \begin{bmatrix} -1 & 4 & -3 \\ 2 & -8 & 6 \\ 1 & -4 & 3 \end{bmatrix} && \text{...(ii)}
\end{aligned}$$

समी (i) तथा (ii) से,

$$\therefore\; \boxed{(AB)' = B'A'}$$ -----------**[1 अंक]**

**प्र. 56**  `[2 अंक · 2016 · अति लघु उत्तरीय प्रश्न]`

**यदि $A = \begin{bmatrix} 1 & 2 & 5 \\ 3 & 4 & 6 \end{bmatrix}$ तथा $B = \begin{bmatrix} 4 & 0 \\ 2 & 1 \\ 1 & 5 \end{bmatrix}$ है, तो सिद्ध कीजिए कि**

$$AB \neq BA$$

**उत्तर:**
दिया है, $A = \begin{bmatrix}1 & 2 & 5\\ 3 & 4 & 6\end{bmatrix}$ कोटि $2 \times 3$ का तथा $B = \begin{bmatrix}4 & 0\\ 2 & 1\\ 1 & 5\end{bmatrix}$ कोटि $3 \times 2$ का है।

$AB$ में पंक्तियाँ $A$ की तथा स्तम्भ $B$ के हैं, इसलिए उसकी कोटि $2 \times 2$ होगी,

$$\begin{aligned}
AB &= \begin{bmatrix}1 & 2 & 5\\ 3 & 4 & 6\end{bmatrix}\begin{bmatrix}4 & 0\\ 2 & 1\\ 1 & 5\end{bmatrix} \\
&= \begin{bmatrix}4+4+5 & 0+2+25\\ 12+8+6 & 0+4+30\end{bmatrix} \\
&= \begin{bmatrix}13 & 27\\ 26 & 34\end{bmatrix} && \text{...(i)}
\end{aligned}$$

$BA$ में पंक्तियाँ $B$ की तथा स्तम्भ $A$ के हैं, इसलिए उसकी कोटि $3 \times 3$ होगी,

$$\begin{aligned}
BA &= \begin{bmatrix}4 & 0\\ 2 & 1\\ 1 & 5\end{bmatrix}\begin{bmatrix}1 & 2 & 5\\ 3 & 4 & 6\end{bmatrix} \\
&= \begin{bmatrix}4+0 & 8+0 & 20+0\\ 2+3 & 4+4 & 10+6\\ 1+15 & 2+20 & 5+30\end{bmatrix} \\
&= \begin{bmatrix}4 & 8 & 20\\ 5 & 8 & 16\\ 16 & 22 & 35\end{bmatrix} && \text{...(ii)}
\end{aligned}$$

समी (i) कोटि $2 \times 2$ का आव्यूह है और समी (ii) कोटि $3 \times 3$ का; दोनों की कोटि ही अलग है, इसलिए वे बराबर हो ही नहीं सकते।

$$\therefore\; \boxed{AB \neq BA}$$

इति सिद्धम्

🧠 **पूरा जवाब इसी एक लाइन में है** — $AB$ की कोटि $2\times2$ है और $BA$ की $3\times3$; कोटि अलग हो तो बराबर हो ही नहीं सकते।

**प्र. 57**  `[2 अंक · 2014 · 2007 · अति लघु उत्तरीय प्रश्न]`

**यदि $A = \begin{bmatrix} 1 & 0 \\ 1 & 1 \end{bmatrix}, B = \begin{bmatrix} 2 & 0 \\ 1 & 1 \end{bmatrix}$ तथा $C = \begin{bmatrix} -1 & 2 \\ 3 & 1 \end{bmatrix}$, तो सिद्ध कीजिए**

$$A(B + C) = AB + AC$$

**उत्तर:** दिया है, $A = \begin{bmatrix} 1 & 0 \\ 1 & 1 \end{bmatrix}$, $B = \begin{bmatrix} 2 & 0 \\ 1 & 1 \end{bmatrix}$ तथा $C = \begin{bmatrix} -1 & 2 \\ 3 & 1 \end{bmatrix}$

$$B + C = \begin{bmatrix} 2 & 0 \\ 1 & 1 \end{bmatrix} + \begin{bmatrix} -1 & 2 \\ 3 & 1 \end{bmatrix} = \begin{bmatrix} 2-1 & 0+2 \\ 1+3 & 1+1 \end{bmatrix} = \begin{bmatrix} 1 & 2 \\ 4 & 2 \end{bmatrix}$$

$$\begin{aligned}
\text{बायाँ पक्ष} = A(B + C) &= \begin{bmatrix} 1 & 0 \\ 1 & 1 \end{bmatrix}\begin{bmatrix} 1 & 2 \\ 4 & 2 \end{bmatrix} \\
&= \begin{bmatrix} 1 \times 1 + 0 \times 4 & 1 \times 2 + 0 \times 2 \\ 1 \times 1 + 1 \times 4 & 1 \times 2 + 1 \times 2 \end{bmatrix} = \begin{bmatrix} 1 & 2 \\ 5 & 4 \end{bmatrix} && \text{...(i)}
\end{aligned}$$

अब,

$$AB = \begin{bmatrix} 1 & 0 \\ 1 & 1 \end{bmatrix}\begin{bmatrix} 2 & 0 \\ 1 & 1 \end{bmatrix} = \begin{bmatrix} 1 \times 2 + 0 \times 1 & 1 \times 0 + 0 \times 1 \\ 1 \times 2 + 1 \times 1 & 1 \times 0 + 1 \times 1 \end{bmatrix} = \begin{bmatrix} 2 & 0 \\ 3 & 1 \end{bmatrix}$$ -----------**[1 अंक]**

$$\begin{aligned}
AC &= \begin{bmatrix} 1 & 0 \\ 1 & 1 \end{bmatrix}\begin{bmatrix} -1 & 2 \\ 3 & 1 \end{bmatrix} \\
&= \begin{bmatrix} 1 \times (-1) + 0 \times 3 & 1 \times 2 + 0 \times 1 \\ 1 \times (-1) + 1 \times 3 & 1 \times 2 + 1 \times 1 \end{bmatrix} = \begin{bmatrix} -1 & 2 \\ 2 & 3 \end{bmatrix}
\end{aligned}$$
$$\begin{aligned}
\text{दायाँ पक्ष} = AB + AC &= \begin{bmatrix} 2 & 0 \\ 3 & 1 \end{bmatrix} + \begin{bmatrix} -1 & 2 \\ 2 & 3 \end{bmatrix} \\
&= \begin{bmatrix} 2-1 & 0+2 \\ 3+2 & 1+3 \end{bmatrix} = \begin{bmatrix} 1 & 2 \\ 5 & 4 \end{bmatrix} && \text{...(ii)}
\end{aligned}$$

समी (i) व (ii) से, बायाँ पक्ष $=$ दायाँ पक्ष

$$\therefore\; \boxed{A(B + C) = AB + AC}$$ -----------**[1 अंक]**

इति सिद्धम्

#### पुस्तक से

**प्र. 58**  `[2 अंक · अति लघु उत्तरीय प्रश्न]`

**यदि $\left[\begin{array}{c} -x+y+z \\ x-y+z \\ x+y-z \end{array}\right] = \left[\begin{array}{l} 1 \\ 2 \\ 3 \end{array}\right]$, तो $x, y, z$ के मान ज्ञात करें।**

**उत्तर:** $x = 2.5,\ y = 2,\ z = 1.5$

दोनों आव्यूह समान हैं, इसलिए संगत अवयवों की तुलना करने पर,

$$\begin{aligned}
-x + y + z &= 1 && \text{...(i)} \\
x - y + z &= 2 && \text{...(ii)} \\
x + y - z &= 3 && \text{...(iii)}
\end{aligned}$$

समी (i) तथा (ii) जोड़ने पर,

$$\begin{aligned}
2z &= 3 \\
z &= \frac{3}{2}
\end{aligned}$$

समी (ii) तथा (iii) जोड़ने पर,

$$\begin{aligned}
2x &= 5 \\
x &= \frac{5}{2}
\end{aligned}$$

समी (i) तथा (iii) जोड़ने पर,

$$\begin{aligned}
2y &= 4 \\
y &= 2
\end{aligned}$$

$$\therefore\; \boxed{x = \frac{5}{2}},\ \boxed{y = 2},\ \boxed{z = \frac{3}{2}}$$

**प्र. 59**  `[2 अंक · अति लघु उत्तरीय प्रश्न]`

**यदि $A = \begin{bmatrix} 2 & -3 & -5 \\ -1 & 4 & 5 \\ 1 & -3 & -4 \end{bmatrix}$ तथा $B = \begin{bmatrix} 2 & -2 & -4 \\ -1 & 3 & 4 \\ 1 & -2 & -3 \end{bmatrix}$**
**सिद्ध करो (i) $AB = A$**
**(ii) $BA = B$**

**उत्तर:**
दिया है, $A = \begin{bmatrix}2 & -3 & -5\\ -1 & 4 & 5\\ 1 & -3 & -4\end{bmatrix}$ तथा $B = \begin{bmatrix}2 & -2 & -4\\ -1 & 3 & 4\\ 1 & -2 & -3\end{bmatrix}$

गुणनफल $AB$ का हर अवयव अलग,

$$\begin{aligned}
C_{11} &= 2(2) + (-3)(-1) + (-5)(1) = 4+3-5 = 2 \\
C_{12} &= 2(-2) + (-3)(3) + (-5)(-2) = -4-9+10 = -3 \\
C_{13} &= 2(-4) + (-3)(4) + (-5)(-3) = -8-12+15 = -5 \\
C_{21} &= (-1)(2) + 4(-1) + 5(1) = -2-4+5 = -1 \\
C_{22} &= (-1)(-2) + 4(3) + 5(-2) = 2+12-10 = 4 \\
C_{23} &= (-1)(-4) + 4(4) + 5(-3) = 4+16-15 = 5 \\
C_{31} &= 1(2) + (-3)(-1) + (-4)(1) = 2+3-4 = 1 \\
C_{32} &= 1(-2) + (-3)(3) + (-4)(-2) = -2-9+8 = -3 \\
C_{33} &= 1(-4) + (-3)(4) + (-4)(-3) = -4-12+12 = -4
\end{aligned}$$
$$\begin{aligned}
AB &= \begin{bmatrix}2 & -3 & -5\\ -1 & 4 & 5\\ 1 & -3 & -4\end{bmatrix} = A && \text{...(i)}
\end{aligned}$$

गुणनफल $BA$ का हर अवयव अलग,

$$\begin{aligned}
D_{11} &= 2(2) + (-2)(-1) + (-4)(1) = 4+2-4 = 2 \\
D_{12} &= 2(-3) + (-2)(4) + (-4)(-3) = -6-8+12 = -2 \\
D_{13} &= 2(-5) + (-2)(5) + (-4)(-4) = -10-10+16 = -4 \\
D_{21} &= (-1)(2) + 3(-1) + 4(1) = -2-3+4 = -1 \\
D_{22} &= (-1)(-3) + 3(4) + 4(-3) = 3+12-12 = 3 \\
D_{23} &= (-1)(-5) + 3(5) + 4(-4) = 5+15-16 = 4 \\
D_{31} &= 1(2) + (-2)(-1) + (-3)(1) = 2+2-3 = 1 \\
D_{32} &= 1(-3) + (-2)(4) + (-3)(-3) = -3-8+9 = -2 \\
D_{33} &= 1(-5) + (-2)(5) + (-3)(-4) = -5-10+12 = -3
\end{aligned}$$
$$\begin{aligned}
BA &= \begin{bmatrix}2 & -2 & -4\\ -1 & 3 & 4\\ 1 & -2 & -3\end{bmatrix} = B && \text{...(ii)}
\end{aligned}$$

समी (i) तथा (ii) से,

$$\therefore\; \boxed{AB = A},\ \boxed{BA = B}$$

इति सिद्धम्

**प्र. 60**  `[2 अंक · अति लघु उत्तरीय प्रश्न]`

**यदि $A = \begin{bmatrix} 1 & 0 & -1 \\ 2 & 1 & 3 \\ 0 & 1 & 1 \end{bmatrix}$ है, तो सत्यापित कीजिए**
**$A^2 + A = A(A + I)$ जहाँ, $I, 3 \times 3$ कोटि का तत्समक् आव्यूह है। [NCERT Exemplar]**

**उत्तर:** $\because A = \begin{bmatrix} 1 & 0 & -1 \\ 2 & 1 & 3 \\ 0 & 1 & 1 \end{bmatrix}$

$$\begin{aligned}
A^2 = A \times A &= \begin{bmatrix} 1 & 0 & -1 \\ 2 & 1 & 3 \\ 0 & 1 & 1 \end{bmatrix}\begin{bmatrix} 1 & 0 & -1 \\ 2 & 1 & 3 \\ 0 & 1 & 1 \end{bmatrix} \\
&= \begin{bmatrix} 1+0+0 & 0+0+(-1) & -1+0+(-1) \\ 2+2+0 & 0+1+3 & -2+3+3 \\ 0+2+0 & 0+1+1 & 0+3+1 \end{bmatrix} = \begin{bmatrix} 1 & -1 & -2 \\ 4 & 4 & 4 \\ 2 & 2 & 4 \end{bmatrix}
\end{aligned}$$
$$\begin{aligned}
A^2 + A &= \begin{bmatrix} 1 & -1 & -2 \\ 4 & 4 & 4 \\ 2 & 2 & 4 \end{bmatrix} + \begin{bmatrix} 1 & 0 & -1 \\ 2 & 1 & 3 \\ 0 & 1 & 1 \end{bmatrix} \\
&= \begin{bmatrix} 1+1 & -1+0 & -2+(-1) \\ 4+2 & 4+1 & 4+3 \\ 2+0 & 2+1 & 4+1 \end{bmatrix} = \begin{bmatrix} 2 & -1 & -3 \\ 6 & 5 & 7 \\ 2 & 3 & 5 \end{bmatrix}
\end{aligned}$$

अब,

$$A + I = \begin{bmatrix} 1 & 0 & -1 \\ 2 & 1 & 3 \\ 0 & 1 & 1 \end{bmatrix} + \begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{bmatrix} = \begin{bmatrix} 2 & 0 & -1 \\ 2 & 2 & 3 \\ 0 & 1 & 2 \end{bmatrix}$$ -----------**[1 अंक]**

$$\begin{aligned}
A(A + I) &= \begin{bmatrix} 1 & 0 & -1 \\ 2 & 1 & 3 \\ 0 & 1 & 1 \end{bmatrix}\begin{bmatrix} 2 & 0 & -1 \\ 2 & 2 & 3 \\ 0 & 1 & 2 \end{bmatrix} \\
&= \begin{bmatrix} 2+0+0 & 0+0+(-1) & -1+0-2 \\ 4+2+0 & 0+2+3 & -2+3+6 \\ 0+2+0 & 0+2+1 & 0+3+2 \end{bmatrix} \\
&= \begin{bmatrix} 2 & -1 & -3 \\ 6 & 5 & 7 \\ 2 & 3 & 5 \end{bmatrix} = A^2 + A
\end{aligned}$$

$$\therefore\; \boxed{A^2 + A = A(A + I)}$$ -----------**[1 अंक]**

इति सिद्धम्

**प्र. 61**  `[2 अंक · अति लघु उत्तरीय प्रश्न]`

**सिद्ध करो $(AB)' = B' \cdot A'$**
**दिया है $A = \begin{bmatrix} 1 & 2 & 3 \\ -1 & 2 & 4 \\ 0 & 0 & 1 \end{bmatrix}, B = \begin{bmatrix} -1 & -2 & 0 \\ 1 & 1 & 3 \\ -1 & 2 & 0 \end{bmatrix}$**

**उत्तर:**
दिया है, $A = \begin{bmatrix}1 & 2 & 3\\ -1 & 2 & 4\\ 0 & 0 & 1\end{bmatrix}$ तथा $B = \begin{bmatrix}-1 & -2 & 0\\ 1 & 1 & 3\\ -1 & 2 & 0\end{bmatrix}$

गुणनफल $AB$ का हर अवयव अलग,

$$\begin{aligned}
C_{11} &= 1(-1) + 2(1) + 3(-1) = -1+2-3 = -2 \\
C_{12} &= 1(-2) + 2(1) + 3(2) = -2+2+6 = 6 \\
C_{13} &= 1(0) + 2(3) + 3(0) = 0+6+0 = 6 \\
C_{21} &= (-1)(-1) + 2(1) + 4(-1) = 1+2-4 = -1 \\
C_{22} &= (-1)(-2) + 2(1) + 4(2) = 2+2+8 = 12 \\
C_{23} &= (-1)(0) + 2(3) + 4(0) = 0+6+0 = 6 \\
C_{31} &= 0(-1) + 0(1) + 1(-1) = 0+0-1 = -1 \\
C_{32} &= 0(-2) + 0(1) + 1(2) = 0+0+2 = 2 \\
C_{33} &= 0(0) + 0(3) + 1(0) = 0+0+0 = 0
\end{aligned}$$

$$AB = \begin{bmatrix}-2 & 6 & 6\\ -1 & 12 & 6\\ -1 & 2 & 0\end{bmatrix}$$

पंक्तियों तथा स्तम्भों की अदला-बदली करने पर,

$$\begin{aligned}
(AB)' &= \begin{bmatrix}-2 & -1 & -1\\ 6 & 12 & 2\\ 6 & 6 & 0\end{bmatrix} && \text{...(i)}
\end{aligned}$$

अब $A$ तथा $B$ के परिवर्त,

$$\begin{aligned}
B' &= \begin{bmatrix}-1 & 1 & -1\\ -2 & 1 & 2\\ 0 & 3 & 0\end{bmatrix} \\
A' &= \begin{bmatrix}1 & -1 & 0\\ 2 & 2 & 0\\ 3 & 4 & 1\end{bmatrix}
\end{aligned}$$

गुणनफल $B'A'$ का हर अवयव अलग,

$$\begin{aligned}
D_{11} &= (-1)(1) + 1(2) + (-1)(3) = -1+2-3 = -2 \\
D_{12} &= (-1)(-1) + 1(2) + (-1)(4) = 1+2-4 = -1 \\
D_{13} &= (-1)(0) + 1(0) + (-1)(1) = 0+0-1 = -1 \\
D_{21} &= (-2)(1) + 1(2) + 2(3) = -2+2+6 = 6 \\
D_{22} &= (-2)(-1) + 1(2) + 2(4) = 2+2+8 = 12 \\
D_{23} &= (-2)(0) + 1(0) + 2(1) = 0+0+2 = 2 \\
D_{31} &= 0(1) + 3(2) + 0(3) = 0+6+0 = 6 \\
D_{32} &= 0(-1) + 3(2) + 0(4) = 0+6+0 = 6 \\
D_{33} &= 0(0) + 3(0) + 0(1) = 0+0+0 = 0
\end{aligned}$$
$$\begin{aligned}
B'A' &= \begin{bmatrix}-2 & -1 & -1\\ 6 & 12 & 2\\ 6 & 6 & 0\end{bmatrix} && \text{...(ii)}
\end{aligned}$$

समी (i) तथा (ii) से,

$$\therefore\; \boxed{(AB)' = B' \cdot A'}$$

इति सिद्धम्

### विस्तृत उत्तरीय प्रश्न (5 अंक)

#### 2026

#### सम्बन्ध $A^{2}=kI-2I$ से $k$ का मान
**प्र. 62**  `[5 अंक · 2026/set_a_db प्र.40]`

**यदि $A=\begin{bmatrix}3 & -2 \\ 4 & -2\end{bmatrix}$ तथा $I=\begin{bmatrix}1 & 0 \\ 0 & 1\end{bmatrix}$ एवं $A^{2}=kI-2I$, तो $k$ का मान ज्ञात कीजिए।**

⚠️ पेपर में $A^{2}=kI-2I$ छपा है। $kI-2I$ हर $k$ पर एक अदिश आव्यूह है, जबकि छपे हुए $A$ का वर्ग अदिश आव्यूह नहीं बनता, इसलिए यह समीकरण किसी भी $k$ पर सन्तुष्ट नहीं होता। पेपर के हिन्दी और अंग्रेज़ी दोनों भागों में यही छपा है, इसलिए यह नक़्ल की भूल नहीं, पेपर की अपनी है। प्रश्न जैसा छपा है वैसा ही रखा गया है।

**उत्तर:**
दिया है, $A = \begin{bmatrix}3 & -2\\ 4 & -2\end{bmatrix}$ तथा $I = \begin{bmatrix}1 & 0\\ 0 & 1\end{bmatrix}$

$$\begin{aligned}
A^{2} = A \cdot A &= \begin{bmatrix}3 & -2\\ 4 & -2\end{bmatrix}\begin{bmatrix}3 & -2\\ 4 & -2\end{bmatrix} \\
&= \begin{bmatrix}9-8 & -6+4\\ 12-8 & -8+4\end{bmatrix} \\
&= \begin{bmatrix}1 & -2\\ 4 & -4\end{bmatrix} && \text{...(i)}
\end{aligned}$$ -----------**[2 अंक]**

प्रश्न में छपे दाएँ पक्ष में $I$ के गुणज जोड़ने पर,

$$\begin{aligned}
kI - 2I &= (k-2)I \\
&= \begin{bmatrix}k-2 & 0\\ 0 & k-2\end{bmatrix} && \text{...(ii)}
\end{aligned}$$ -----------**[1 अंक]**

समी (ii) में विकर्ण के बाहर वाले दोनों अवयव हर $k$ पर शून्य हैं, जबकि समी (i) में वही अवयव हैं

$$\begin{aligned}
-2 &\neq 0 && \text{(ऊपरी दायाँ अवयव)} \\
4 &\neq 0 && \text{(निचला बायाँ अवयव)}
\end{aligned}$$ -----------**[1 अंक]**

ये दोनों अवयव $k$ पर निर्भर ही नहीं करते, इसलिए इन्हें बराबर कराने वाला कोई $k$ है ही नहीं; यानी इस प्रश्न में जैसा समीकरण छपा है, उसे सन्तुष्ट करने वाला $k$ का कोई मान नहीं है।

$$\therefore\; \boxed{\text{छपे हुए समीकरण के लिए } k \text{ का कोई मान सम्भव नहीं}}$$ -----------**[1 अंक]**

⚠️ **बोर्ड में क्या लिखना है** — ऊपर का निष्कर्ष ठीक उसी समीकरण का है जो पेपर में छपा है, और वही सही निष्कर्ष है। पर पुस्तक तथा NCERT में यही प्रश्न $A^{2}=kA-2I$ के रूप में है, और उसी रूप पर उत्तर $k=1$ बनता है; पूरा हल `प्र. 33` में है। इसलिए कॉपी में पहले एक पंक्ति में छपी हुई भूल लिखिए, फिर $A^{2}=kA-2I$ मानकर हल कीजिए:

$$\begin{bmatrix}1 & -2\\ 4 & -4\end{bmatrix} = \begin{bmatrix}3k-2 & -2k\\ 4k & -2k-2\end{bmatrix} \;\Rightarrow\; 4k = 4 \;\Rightarrow\; k = 1$$

#### $A^{3}-23A-40I=0$ की उपपत्ति
**प्र. 63**  `[5 अंक · 2026/set_b_dc प्र.52 + set_d_cx प्र.54 · 2020/set_c_xc प्र.25]`  *2020 में भी आया था*

**यदि $A=\begin{bmatrix}1&2&3\\3&-2&1\\4&2&1\end{bmatrix}$ है, तो दिखाइए कि $A^{3}-23A-40I=0$।**

**उत्तर:** दर्शाना है कि आव्यूह $A = \begin{bmatrix}1 & 2 & 3\\ 3 & -2 & 1\\ 4 & 2 & 1\end{bmatrix}$ के लिए $A^{3} - 23A - 40I = O$।
हम जानते हैं कि

$$\begin{aligned}
A^{2} &= A \cdot A = \begin{bmatrix}1 & 2 & 3\\ 3 & -2 & 1\\ 4 & 2 & 1\end{bmatrix}\begin{bmatrix}1 & 2 & 3\\ 3 & -2 & 1\\ 4 & 2 & 1\end{bmatrix} = \begin{bmatrix}19 & 4 & 8\\ 1 & 12 & 8\\ 14 & 6 & 15\end{bmatrix} \\
A^{3} &= A \cdot A^{2} = \begin{bmatrix}1 & 2 & 3\\ 3 & -2 & 1\\ 4 & 2 & 1\end{bmatrix}\begin{bmatrix}19 & 4 & 8\\ 1 & 12 & 8\\ 14 & 6 & 15\end{bmatrix} = \begin{bmatrix}63 & 46 & 69\\ 69 & -6 & 23\\ 92 & 46 & 63\end{bmatrix}
\end{aligned}$$ -----------**[2 अंक]**

अब $A^{3} - 23A - 40I$

$$\begin{aligned}
&= \begin{bmatrix}63 & 46 & 69\\ 69 & -6 & 23\\ 92 & 46 & 63\end{bmatrix} - \begin{bmatrix}23 & 46 & 69\\ 69 & -46 & 23\\ 92 & 46 & 23\end{bmatrix} - \begin{bmatrix}40 & 0 & 0\\ 0 & 40 & 0\\ 0 & 0 & 40\end{bmatrix} && \text{[23A व 40I बनाए]} \\
&= \begin{bmatrix}63-23-40 & 46-46+0 & 69-69+0\\ 69-69+0 & -6+46-40 & 23-23+0\\ 92-92+0 & 46-46+0 & 63-23-40\end{bmatrix} = \begin{bmatrix}0 & 0 & 0\\ 0 & 0 & 0\\ 0 & 0 & 0\end{bmatrix} = O
\end{aligned}$$ -----------**[2 अंक]**

$$\therefore\; \boxed{A^{3} - 23A - 40I = O}$$ -----------**[1 अंक]**

इति सिद्धम्

🧮 **calculation सँभालो, ग़लती यहीं होती है** — $A^{3}$ को $A$ और $A^{2}$ के गुणनफल से निकालो; $A^{2}$ ग़लत हुआ तो पूरा घटाव बिगड़ जाएगा।

🔁 **यह सवाल पीछा नहीं छोड़ता** — 3 पेपरों में आ चुका है (2026 के दो सेटों में, और 2020 में), हर बार **5 अंक** का। इसे अच्छे से याद कर लो, ताकि इस बार आए तो पूरे अंक आसानी से मिलें।

#### 2025

#### $I+A=(I-A)\begin{bmatrix}\cos\alpha & -\sin\alpha \\ \sin\alpha & \cos\alpha\end{bmatrix}$ की उपपत्ति
**प्र. 64**  `[5 अंक · 2025/set_a_ja प्र.48]`  *यही सवाल 2 अंक पर प्र. 48 में*


**यदि $A=\begin{bmatrix} 0 & -\tan \dfrac{\alpha}{2} \\ \tan \dfrac{\alpha}{2} & 0 \end{bmatrix}$ तथा $I$ कोटि $2$ का तत्समक आव्यूह है, तो सिद्ध कीजिए कि**
**$I+A=(I-A)\begin{bmatrix} \cos \alpha & -\sin \alpha \\ \sin \alpha & \cos \alpha \end{bmatrix}$ ।**

**उत्तर:** यहाँ, $A = \begin{bmatrix} 0 & -t \\ t & 0 \end{bmatrix}$, जहाँ $t = \tan\left(\frac{\alpha}{2}\right)$

$$\begin{aligned}
\cos \alpha &= \frac{1 - \tan^2\left(\frac{\alpha}{2}\right)}{1 + \tan^2\left(\frac{\alpha}{2}\right)} = \frac{1 - t^2}{1 + t^2} \\
\sin \alpha &= \frac{2\tan\left(\frac{\alpha}{2}\right)}{1 + \tan^2\left(\frac{\alpha}{2}\right)} = \frac{2t}{1 + t^2}
\end{aligned}$$ -----------**[1 अंक]**
$$\begin{aligned}
\text{दायाँ पक्ष} &= (I - A)\begin{bmatrix} \cos \alpha & -\sin \alpha \\ \sin \alpha & \cos \alpha \end{bmatrix} \\
&= \left(\begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} - \begin{bmatrix} 0 & -t \\ +t & 0 \end{bmatrix}\right)\begin{bmatrix} \frac{1-t^2}{1+t^2} & \frac{-2t}{1+t^2} \\ \frac{2t}{1+t^2} & \frac{1-t^2}{1+t^2} \end{bmatrix} \\
&= \begin{bmatrix} 1 & t \\ -t & 1 \end{bmatrix}\begin{bmatrix} \frac{1-t^2}{1+t^2} & \frac{-2t}{1+t^2} \\ \frac{2t}{1+t^2} & \frac{1-t^2}{1+t^2} \end{bmatrix} \\
&= \begin{bmatrix} \frac{1-t^2+2t^2}{1+t^2} & \frac{-2t+t(1-t^2)}{1+t^2} \\ \frac{-t(1-t^2)+2t}{1+t^2} & \frac{2t^2+1-t^2}{1+t^2} \end{bmatrix} \\
&= \begin{bmatrix} \frac{1+t^2}{1+t^2} & \frac{-t(1+t^2)}{1+t^2} \\ \frac{t(1+t^2)}{1+t^2} & \frac{1+t^2}{1+t^2} \end{bmatrix} = \begin{bmatrix} 1 & -t \\ t & 1 \end{bmatrix} \\
&= \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} + \begin{bmatrix} 0 & -t \\ t & 0 \end{bmatrix} \\
&= \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} + \begin{bmatrix} 0 & -\tan(\alpha/2) \\ \tan(\alpha/2) & 0 \end{bmatrix} = I + A = \text{बायाँ पक्ष}
\end{aligned}$$ -----------**[3 अंक]**

$$\therefore\; \boxed{I + A = (I - A)\begin{bmatrix} \cos \alpha & -\sin \alpha \\ \sin \alpha & \cos \alpha \end{bmatrix}}$$ -----------**[1 अंक]**

इति सिद्धम्
⚠ **स्रोत-नोट:** पुस्तक के इस हल की अंतिम-से-पूर्व पंक्ति में नीचे-बाएँ अवयव का हर $1+t$ छपा है, जो छपाई की भूल है; ऊपर की पंक्ति में सही हर $1+t^2$ लिखा गया है। कॉपी में भी यही लिखिए।

#### $A^{2}-5A+7I=0$ का सत्यापन तथा उससे $A^{-1}$
**प्र. 65**  `[5 अंक · 2025/set_c_jc प्र.51]`  *यही सवाल 8 अंक पर प्र. 86 में*

**यदि $A=\begin{bmatrix}3 & 1\\ -1 & 2\end{bmatrix}$ है तो दर्शाइए कि $A^{2}-5A+7I=0$ है। इसकी सहायता से $A^{-1}$ ज्ञात कीजिए।**

**उत्तर:** दिया है, $A = \begin{bmatrix} 3 & 1 \\ -1 & 2 \end{bmatrix}$

$$\begin{aligned}
A^2 = A \times A &= \begin{bmatrix} 3 & 1 \\ -1 & 2 \end{bmatrix}\begin{bmatrix} 3 & 1 \\ -1 & 2 \end{bmatrix} \\
&= \begin{bmatrix} 9-1 & 3+2 \\ -3-2 & -1+4 \end{bmatrix} = \begin{bmatrix} 8 & 5 \\ -5 & 3 \end{bmatrix}
\end{aligned}$$ -----------**[1 अंक]**
$$\begin{aligned}
\text{बायाँ पक्ष} = A^2 - 5A + 7I &= \begin{bmatrix} 8 & 5 \\ -5 & 3 \end{bmatrix} - 5\begin{bmatrix} 3 & 1 \\ -1 & 2 \end{bmatrix} + 7\begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} \\
&= \begin{bmatrix} 8-15+7 & 5-5+0 \\ -5+5+0 & 3-10+7 \end{bmatrix} \\
&= \begin{bmatrix} 0 & 0 \\ 0 & 0 \end{bmatrix} = O = \text{दायाँ पक्ष}
\end{aligned}$$ -----------**[2 अंक]**

अब, $A^2 - 5A + 7I = O$; $A^{-1}$ से गुणा करने पर,

$$\begin{aligned}
A - 5I + 7A^{-1} &= O && [\because AA^{-1} = I] \\
\begin{bmatrix} 3 & 1 \\ -1 & 2 \end{bmatrix} - 5\begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} + 7A^{-1} &= O \\
7A^{-1} &= \begin{bmatrix} 5 & 0 \\ 0 & 5 \end{bmatrix} - \begin{bmatrix} 3 & 1 \\ -1 & 2 \end{bmatrix} \\
7A^{-1} &= \begin{bmatrix} 5-3 & 0-1 \\ 0+1 & 5-2 \end{bmatrix}
\end{aligned}$$ -----------**[1 अंक]**

$$\therefore\; \boxed{A^{-1} = \frac{1}{7}\begin{bmatrix} 2 & -1 \\ 1 & 3 \end{bmatrix}}$$ -----------**[1 अंक]**

🔗 **यह वही सवाल है** — यही सर्वसमिका से $A^{-1}$ वाला सवाल प्र. 78, प्र. 79, प्र. 86 और प्र. 87 में भी है; एक बार कर लो तो पाँचों हो जाएँगे।

#### $n$ क्रम के व्युत्क्रमणीय आव्यूहों पर $(AB)^{-1}=B^{-1}A^{-1}$ की उपपत्ति
**प्र. 66**  `[5 अंक · 2025/set_d_jd प्र.51]`  *यही सवाल 2 अंक पर प्र. 43 में*


**यदि $A$ तथा $B$, $n$ क्रम के दो आव्यूह हैं जो व्युत्क्रमणीय हैं तब सिद्ध करें कि $(AB)^{-1}=B^{-1}A^{-1}$।**

**उत्तर:** दिया है $A$ तथा $B$ व्युत्क्रमणीय वर्ग आव्यूह हैं। सिद्ध करना है $(AB)^{-1} = B^{-1}A^{-1}$

गुणन के साहचर्य नियम से,

$$\begin{aligned}
AB(B^{-1}A^{-1}) &= A(BB^{-1})A^{-1} = AIA^{-1} && [\because BB^{-1} = I] \\
&= AA^{-1} && [\because AI = A] \\
&= I && \text{...(i)}
\end{aligned}$$ -----------**[2 अंक]**

इसी प्रकार,

$$\begin{aligned}
(B^{-1}A^{-1})AB &= B^{-1}(A^{-1}A)B = B^{-1}IB && [\because A^{-1}A = I] \\
&= B^{-1}B = I && [\because IB = B]
\end{aligned}$$ -----------**[2 अंक]**

$$AB(B^{-1}A^{-1}) = (B^{-1}A^{-1})AB = I \quad \text{...(ii)}$$

समी (i) तथा (ii) से, $AB(B^{-1}A^{-1}) = I = (B^{-1}A^{-1})AB$

अत: $B^{-1}A^{-1},\ AB$ का व्युत्क्रम है।

$$\therefore\; \boxed{(AB)^{-1} = B^{-1}A^{-1}}$$ -----------**[1 अंक]**

इति सिद्धम्

#### 2024

#### $X+Y$ तथा $X-Y$ दिए होने पर आव्यूह $X$ तथा $Y$
**प्र. 67**  `[5 अंक · 2024/set_d_fd प्र.52]`  *यही सवाल 1 अंक पर प्र. 26 में*


**यदि आव्यूह $X+Y=\begin{bmatrix}5 & 2 \\ 0 & 9\end{bmatrix}$ तथा आव्यूह $X-Y=\begin{bmatrix}3 & 6 \\ 0 & -1\end{bmatrix}$ हैं तो $X$ और $Y$ आव्यूहों को ज्ञात कीजिए।**

**उत्तर:** दोनों समीकरण जोड़ने पर:

$$\begin{aligned}
2X &= \begin{bmatrix}5 & 2\\ 0 & 9\end{bmatrix} + \begin{bmatrix}3 & 6\\ 0 & -1\end{bmatrix} = \begin{bmatrix}8 & 8\\ 0 & 8\end{bmatrix} \\
X &= \frac{1}{2}\begin{bmatrix}8 & 8\\ 0 & 8\end{bmatrix} = \begin{bmatrix}4 & 4\\ 0 & 4\end{bmatrix}
\end{aligned}$$ -----------**[2 अंक]**

दोनों समीकरण घटाने पर:

$$\begin{aligned}
2Y &= \begin{bmatrix}5 & 2\\ 0 & 9\end{bmatrix} - \begin{bmatrix}3 & 6\\ 0 & -1\end{bmatrix} = \begin{bmatrix}2 & -4\\ 0 & 10\end{bmatrix} \\
Y &= \frac{1}{2}\begin{bmatrix}2 & -4\\ 0 & 10\end{bmatrix} = \begin{bmatrix}1 & -2\\ 0 & 5\end{bmatrix}
\end{aligned}$$ -----------**[2 अंक]**

$$\therefore\; \boxed{X = \begin{bmatrix} 4 & 4 \\ 0 & 4 \end{bmatrix}},\ \boxed{Y = \begin{bmatrix} 1 & -2 \\ 0 & 5 \end{bmatrix}}$$ -----------**[1 अंक]**

#### 2023

#### समीकरण $2A+3X=5B$ से आव्यूह $X$
**प्र. 68**  `[5 अंक · 2023/set_b_bd प्र.50]`

**यदि $A=\begin{bmatrix}8&0\\4&-2\\3&6\end{bmatrix},\ B=\begin{bmatrix}2&-2\\4&2\\-5&1\end{bmatrix}$ तथा $2A+3X=5B$ हो, तो आव्यूह $X$ ज्ञात कीजिए।**

**उत्तर:** $A = \begin{bmatrix} 8 & 0 \\ 4 & -2 \\ 3 & 6 \end{bmatrix}$, $B = \begin{bmatrix} 2 & -2 \\ 4 & 2 \\ -5 & 1 \end{bmatrix}$

$$2\begin{bmatrix} 8 & 0 \\ 4 & -2 \\ 3 & 6 \end{bmatrix} + 3X = 5\begin{bmatrix} 2 & -2 \\ 4 & 2 \\ -5 & 1 \end{bmatrix}$$ -----------**[2 अंक]**

$$\begin{aligned}
3X &= \begin{bmatrix} 10 & -10 \\ 20 & 10 \\ -25 & 5 \end{bmatrix} - \begin{bmatrix} 16 & 0 \\ 8 & -4 \\ 6 & 12 \end{bmatrix} \\
3X &= \begin{bmatrix} -6 & -10 \\ 12 & 14 \\ -31 & -7 \end{bmatrix}
\end{aligned}$$ -----------**[1 अंक]**

$$\therefore\; \boxed{X = \begin{bmatrix} -2 & \frac{-10}{3} \\ 4 & \frac{14}{3} \\ \frac{-31}{3} & \frac{-7}{3} \end{bmatrix}}$$ -----------**[2 अंक]**

🧮 **calculation सँभालो, ग़लती यहीं होती है** — $3X$ तक पहुँचकर रुकना नहीं है; हर अवयव को 3 से भाग देने पर ही $X$ मिलता है।

#### शर्त $CD-AB=0$ से आव्यूह $D$
**प्र. 69**  `[5 अंक · 2023/set_a_bb प्र.66]`  *यही सवाल 8 अंक पर प्र. 76 में*

**मान लीजिए कि $A=\begin{bmatrix}2 & -1\\3 & 4\end{bmatrix},\; B=\begin{bmatrix}5 & 2\\7 & 4\end{bmatrix},\; C=\begin{bmatrix}2 & 5\\3 & 8\end{bmatrix}$ है। तो एक ऐसा आव्यूह $D$ ज्ञात कीजिए कि $CD-AB=0$ हो।**

**उत्तर:** क्योंकि $A$, $B$, $C$ सभी कोटि 2 के वर्ग आव्यूह हैं और $CD - AB$ भली-भाँति परिभाषित है, इसलिए $D$ कोटि 2 का एक वर्ग आव्यूह होना चाहिए।

मान लीजिए कि, $D = \begin{bmatrix}a & b\\ c & d\end{bmatrix}$ है। तब $CD - AB = O$ से प्राप्त होता है

$$\begin{aligned}
\begin{bmatrix}2 & 5\\ 3 & 8\end{bmatrix} \begin{bmatrix}a & b\\ c & d\end{bmatrix} - \begin{bmatrix}2 & -1\\ 3 & 4\end{bmatrix} \begin{bmatrix}5 & 2\\ 7 & 4\end{bmatrix} &= O \\
\begin{bmatrix}2a + 5c & 2b + 5d\\ 3a + 8c & 3b + 8d\end{bmatrix} - \begin{bmatrix}3 & 0\\ 43 & 22\end{bmatrix} &= \begin{bmatrix}0 & 0\\ 0 & 0\end{bmatrix} \\
\begin{bmatrix}2a + 5c - 3 & 2b + 5d\\ 3a + 8c - 43 & 3b + 8d - 22\end{bmatrix} &= \begin{bmatrix}0 & 0\\ 0 & 0\end{bmatrix}
\end{aligned}$$ -----------**[1 अंक]**

आव्यूह की समानता से हमें निम्नलिखित समीकरण प्राप्त होते हैं:

$$\begin{aligned}
2a + 5c - 3 &= 0 && \text{...(i)} \\
3a + 8c - 43 &= 0 && \text{...(ii)} \\
2b + 5d &= 0 && \text{...(iii)} \\
3b + 8d - 22 &= 0 && \text{...(iv)}
\end{aligned}$$ -----------**[1 अंक]**

समी (i) को 3 से तथा समी (ii) को 2 से गुणा करने पर,

$$\begin{aligned}
6a + 15c &= 9 \\
6a + 16c &= 86
\end{aligned}$$

पहली को दूसरी में से घटाने पर $c = 77$, और यह मान समी (i) में रखने पर

$$2a + 5(77) = 3 \;\Rightarrow\; 2a = 3 - 385 = -382 \;\Rightarrow\; a = -191$$ -----------**[1 अंक]**

समी (iii) को 3 से तथा समी (iv) को 2 से गुणा करने पर,

$$\begin{aligned}
6b + 15d &= 0 \\
6b + 16d &= 44
\end{aligned}$$

पहली को दूसरी में से घटाने पर $d = 44$, और यह मान समी (iii) में रखने पर

$$2b + 5(44) = 0 \;\Rightarrow\; 2b = -220 \;\Rightarrow\; b = -110$$ -----------**[1 अंक]**

$$\therefore\; \boxed{D = \begin{bmatrix}a & b\\ c & d\end{bmatrix} = \begin{bmatrix}-191 & -110\\ 77 & 44\end{bmatrix}}$$ -----------**[1 अंक]**

#### दिए हुए $2\times2$ आव्यूहों पर $(AB)^{-1}=B^{-1}A^{-1}$ की उपपत्ति
**प्र. 70**  `[5 अंक · 2023/set_d_ay प्र.56]`

**यदि $A = \begin{bmatrix} 2 & 3 \\ 1 & -4 \end{bmatrix}$ तथा $B = \begin{bmatrix} 1 & -2 \\ -1 & 3 \end{bmatrix}$ हो, तो सिद्ध कीजिए कि $(AB)^{-1} = B^{-1}A^{-1}$।**

**उत्तर:**
दिया है, $A = \begin{bmatrix}2 & 3\\ 1 & -4\end{bmatrix}$ तथा $B = \begin{bmatrix}1 & -2\\ -1 & 3\end{bmatrix}$

$$\begin{aligned}
AB &= \begin{bmatrix}2 & 3\\ 1 & -4\end{bmatrix}\begin{bmatrix}1 & -2\\ -1 & 3\end{bmatrix} \\
&= \begin{bmatrix}2-3 & -4+9\\ 1+4 & -2-12\end{bmatrix} \\
&= \begin{bmatrix}-1 & 5\\ 5 & -14\end{bmatrix} && \text{...(i)}
\end{aligned}$$ -----------**[1 अंक]**

व्युत्क्रम की परिभाषा से, माना $A^{-1} = \begin{bmatrix}p & q\\ r & s\end{bmatrix}$; तब $A \cdot A^{-1} = I$ से,

$$\begin{aligned}
\begin{bmatrix}2p+3r & 2q+3s\\ p-4r & q-4s\end{bmatrix} &= \begin{bmatrix}1 & 0\\ 0 & 1\end{bmatrix}
\end{aligned}$$

संगत अवयवों की तुलना करने पर,

$$\begin{aligned}
2p + 3r &= 1 && \text{...(ii)} \\
p - 4r &= 0 && \text{...(iii)} \\
2q + 3s &= 0 && \text{...(iv)} \\
q - 4s &= 1 && \text{...(v)}
\end{aligned}$$

समी (iii) से $p = 4r$; इसे समी (ii) में रखने पर,

$$\begin{aligned}
8r + 3r &= 1 \\
11r &= 1 \\
r &= \frac{1}{11} \\
p &= \frac{4}{11}
\end{aligned}$$

समी (v) से $q = 1 + 4s$; इसे समी (iv) में रखने पर,

$$\begin{aligned}
2 + 8s + 3s &= 0 \\
11s &= -2 \\
s &= -\frac{2}{11} \\
q &= \frac{3}{11}
\end{aligned}$$
$$\begin{aligned}
A^{-1} &= \frac{1}{11}\begin{bmatrix}4 & 3\\ 1 & -2\end{bmatrix}
\end{aligned}$$ -----------**[1 अंक]**

इसी प्रकार माना $B^{-1} = \begin{bmatrix}u & v\\ w & z\end{bmatrix}$; तब $B \cdot B^{-1} = I$ से,

$$\begin{aligned}
\begin{bmatrix}u-2w & v-2z\\ -u+3w & -v+3z\end{bmatrix} &= \begin{bmatrix}1 & 0\\ 0 & 1\end{bmatrix}
\end{aligned}$$

संगत अवयवों की तुलना करने पर,

$$\begin{aligned}
u - 2w &= 1 && \text{...(vi)} \\
-u + 3w &= 0 && \text{...(vii)} \\
v - 2z &= 0 && \text{...(viii)} \\
-v + 3z &= 1 && \text{...(ix)}
\end{aligned}$$

समी (vi) तथा (vii) जोड़ने पर $w = 1$, और समी (vii) से $u = 3$।

समी (viii) तथा (ix) जोड़ने पर $z = 1$, और समी (viii) से $v = 2$।

$$\begin{aligned}
B^{-1} &= \begin{bmatrix}3 & 2\\ 1 & 1\end{bmatrix}
\end{aligned}$$ -----------**[1 अंक]**
$$\begin{aligned}
B^{-1}A^{-1} &= \begin{bmatrix}3 & 2\\ 1 & 1\end{bmatrix} \cdot \frac{1}{11}\begin{bmatrix}4 & 3\\ 1 & -2\end{bmatrix} \\
&= \frac{1}{11}\begin{bmatrix}12+2 & 9-4\\ 4+1 & 3-2\end{bmatrix} \\
&= \frac{1}{11}\begin{bmatrix}14 & 5\\ 5 & 1\end{bmatrix} && \text{...(x)}
\end{aligned}$$ -----------**[1 अंक]**

समी (i) तथा (x) का गुणनफल लेने पर,

$$\begin{aligned}
(AB)(B^{-1}A^{-1}) &= \begin{bmatrix}-1 & 5\\ 5 & -14\end{bmatrix} \cdot \frac{1}{11}\begin{bmatrix}14 & 5\\ 5 & 1\end{bmatrix} \\
&= \frac{1}{11}\begin{bmatrix}-14+25 & -5+5\\ 70-70 & 25-14\end{bmatrix} \\
&= \frac{1}{11}\begin{bmatrix}11 & 0\\ 0 & 11\end{bmatrix} = I
\end{aligned}$$

इसी प्रकार दूसरे क्रम में गुणा करने पर,

$$\begin{aligned}
(B^{-1}A^{-1})(AB) &= \frac{1}{11}\begin{bmatrix}14 & 5\\ 5 & 1\end{bmatrix}\begin{bmatrix}-1 & 5\\ 5 & -14\end{bmatrix} \\
&= \frac{1}{11}\begin{bmatrix}-14+25 & 70-70\\ -5+5 & 25-14\end{bmatrix} \\
&= \frac{1}{11}\begin{bmatrix}11 & 0\\ 0 & 11\end{bmatrix} = I
\end{aligned}$$

दोनों क्रमों में गुणनफल $I$ मिला, और व्युत्क्रम की परिभाषा यही है।

$$\therefore\; \boxed{(AB)^{-1} = B^{-1}A^{-1}}$$ -----------**[1 अंक]**

इति सिद्धम्

#### 2022

#### $A^{3}-6A^{2}+7A+2I=0$ की उपपत्ति
**प्र. 71**  `[5 अंक · 2022/set_d_fj प्र.50]`  *यही सवाल 4 अंक पर प्र. 81 में*

**यदि $A=\begin{bmatrix}1&0&2\\0&2&1\\2&0&3\end{bmatrix}$ है तो सिद्ध कीजिए कि $A^{3}-6A^{2}+7A+2I=0$.**

**उत्तर:** यहाँ,

$$\begin{aligned}
A^2 = A \times A &= \begin{bmatrix} 1 & 0 & 2 \\ 0 & 2 & 1 \\ 2 & 0 & 3 \end{bmatrix}\begin{bmatrix} 1 & 0 & 2 \\ 0 & 2 & 1 \\ 2 & 0 & 3 \end{bmatrix} \\
&= \begin{bmatrix} 1+0+4 & 0+0+0 & 2+0+6 \\ 0+0+2 & 0+4+0 & 0+2+3 \\ 2+0+6 & 0+0+0 & 4+0+9 \end{bmatrix} = \begin{bmatrix} 5 & 0 & 8 \\ 2 & 4 & 5 \\ 8 & 0 & 13 \end{bmatrix}
\end{aligned}$$ -----------**[1 अंक]**
$$\begin{aligned}
A^3 = A^2 \times A &= \begin{bmatrix} 5 & 0 & 8 \\ 2 & 4 & 5 \\ 8 & 0 & 13 \end{bmatrix}\begin{bmatrix} 1 & 0 & 2 \\ 0 & 2 & 1 \\ 2 & 0 & 3 \end{bmatrix} \\
&= \begin{bmatrix} 5+0+16 & 0+0+0 & 10+0+24 \\ 2+0+10 & 0+8+0 & 4+4+15 \\ 8+0+26 & 0+0+0 & 16+0+39 \end{bmatrix} = \begin{bmatrix} 21 & 0 & 34 \\ 12 & 8 & 23 \\ 34 & 0 & 55 \end{bmatrix}
\end{aligned}$$ -----------**[2 अंक]**
$$\begin{aligned}
A^3 - 6A^2 + 7A + 2I &= \begin{bmatrix} 21 & 0 & 34 \\ 12 & 8 & 23 \\ 34 & 0 & 55 \end{bmatrix} - 6\begin{bmatrix} 5 & 0 & 8 \\ 2 & 4 & 5 \\ 8 & 0 & 13 \end{bmatrix} + 7\begin{bmatrix} 1 & 0 & 2 \\ 0 & 2 & 1 \\ 2 & 0 & 3 \end{bmatrix} + 2\begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{bmatrix} \\
&= \begin{bmatrix} 21 & 0 & 34 \\ 12 & 8 & 23 \\ 34 & 0 & 55 \end{bmatrix} - \begin{bmatrix} 30 & 0 & 48 \\ 12 & 24 & 30 \\ 48 & 0 & 78 \end{bmatrix} + \begin{bmatrix} 7 & 0 & 14 \\ 0 & 14 & 7 \\ 14 & 0 & 21 \end{bmatrix} + \begin{bmatrix} 2 & 0 & 0 \\ 0 & 2 & 0 \\ 0 & 0 & 2 \end{bmatrix} \\
&= \begin{bmatrix} 21-30+7+2 & 0-0+0+0 & 34-48+14+0 \\ 12-12+0+0 & 8-24+14+2 & 23-30+7+0 \\ 34-48+14+0 & 0-0+0+0 & 55-78+21+2 \end{bmatrix}
\end{aligned}$$ -----------**[1 अंक]**

$$\therefore\; \boxed{A^3 - 6A^2 + 7A + 2I = \begin{bmatrix} 0 & 0 & 0 \\ 0 & 0 & 0 \\ 0 & 0 & 0 \end{bmatrix} = O}$$ -----------**[1 अंक]**

इति सिद्धम्

#### आव्यूह को सममित तथा विषम-सममित आव्यूहों के योगफल के रूप में लिखना
**प्र. 72**  `[5 अंक · 2022/set_a_ff प्र.49]`

**आव्यूह $A=\begin{bmatrix}3 & 3 & -1\\-2 & -2 & 1\\-4 & -5 & 2\end{bmatrix}$ को एक सममित आव्यूह तथा एक विषम-सममित आव्यूह के योगफल के रूप में व्यक्त कीजिए।**

**उत्तर:** दिया है, $A = \begin{bmatrix} 3 & 3 & -1 \\ -2 & -2 & 1 \\ -4 & -5 & 2 \end{bmatrix} \Rightarrow A' = \begin{bmatrix} 3 & -2 & -4 \\ 3 & -2 & -5 \\ -1 & 1 & 2 \end{bmatrix}$

माना $A = P + Q$ ...(i), जहाँ $P = \frac{1}{2}(A + A')$ तथा $Q = \frac{1}{2}(A - A')$

अब,

$$\begin{aligned}
P &= \frac{1}{2}\left( \begin{bmatrix} 3 & 3 & -1 \\ -2 & -2 & 1 \\ -4 & -5 & 2 \end{bmatrix} + \begin{bmatrix} 3 & -2 & -4 \\ 3 & -2 & -5 \\ -1 & 1 & 2 \end{bmatrix} \right) \\
&= \frac{1}{2}\begin{bmatrix} 6 & 1 & -5 \\ 1 & -4 & -4 \\ -5 & -4 & 4 \end{bmatrix} = \begin{bmatrix} 3 & \frac{1}{2} & -\frac{5}{2} \\ \frac{1}{2} & -2 & -2 \\ -\frac{5}{2} & -2 & 2 \end{bmatrix} \\
P' &= \begin{bmatrix} 3 & \frac{1}{2} & -\frac{5}{2} \\ \frac{1}{2} & -2 & -2 \\ -\frac{5}{2} & -2 & 2 \end{bmatrix} = P
\end{aligned}$$

अत: $P$ एक सममित आव्यूह है।

$$\begin{aligned}
Q = \frac{1}{2}(A - A') &= \frac{1}{2}\left( \begin{bmatrix} 3 & 3 & -1 \\ -2 & -2 & 1 \\ -4 & -5 & 2 \end{bmatrix} - \begin{bmatrix} 3 & -2 & -4 \\ 3 & -2 & -5 \\ -1 & 1 & 2 \end{bmatrix} \right) \\
&= \frac{1}{2}\begin{bmatrix} 0 & 5 & 3 \\ -5 & 0 & 6 \\ -3 & -6 & 0 \end{bmatrix} = \begin{bmatrix} 0 & \frac{5}{2} & \frac{3}{2} \\ -\frac{5}{2} & 0 & 3 \\ -\frac{3}{2} & -3 & 0 \end{bmatrix} \\
Q' &= \begin{bmatrix} 0 & -\frac{5}{2} & -\frac{3}{2} \\ \frac{5}{2} & 0 & -3 \\ \frac{3}{2} & 3 & 0 \end{bmatrix} = -Q
\end{aligned}$$

अत: $Q$ एक विषम सममित आव्यूह है। समी (i) से, $A =$ सममित आव्यूह $+$ विषम सममित आव्यूह

$$\therefore\; \boxed{A = \begin{bmatrix} 3 & \frac{1}{2} & -\frac{5}{2} \\ \frac{1}{2} & -2 & -2 \\ -\frac{5}{2} & -2 & 2 \end{bmatrix} + \begin{bmatrix} 0 & \frac{5}{2} & \frac{3}{2} \\ -\frac{5}{2} & 0 & 3 \\ -\frac{3}{2} & -3 & 0 \end{bmatrix}}$$

🧮 **calculation सँभालो, ग़लती यहीं होती है** — $P$ और $Q$ दोनों में आधा लगता है; $\frac{1}{2}$ छूट गया तो $P+Q$ वापस $A$ नहीं बनेगा।

#### 2020

#### घूर्णन आव्यूह की $n$-वीं घात $A^{n}$ की उपपत्ति
**प्र. 73**  `[5 अंक · 2020/set_b_xd प्र.54]`

**यदि $A=\begin{bmatrix} \cos\theta & \sin\theta \\ -\sin\theta & \cos\theta \end{bmatrix}$, तो सिद्ध कीजिए कि**
**$A^{n}=\begin{bmatrix} \cos n\theta & \sin n\theta \\ -\sin n\theta & \cos n\theta \end{bmatrix}$,**
**जहाँ $n\in N$.**

**उत्तर:**
दिया है, $A = \begin{bmatrix}\cos\theta & \sin\theta\\ -\sin\theta & \cos\theta\end{bmatrix}$

सिद्ध करने वाले रूप में $n = 1$ रखने पर दायाँ पक्ष $= \begin{bmatrix}\cos\theta & \sin\theta\\ -\sin\theta & \cos\theta\end{bmatrix} = A = A^{1}$, यानी कथन $n = 1$ के लिए सत्य है। -----------**[1 अंक]**

अब मान लीजिए कि कथन किसी $n = k$ के लिए सत्य है, अर्थात्

$$\begin{aligned}
A^{k} &= \begin{bmatrix}\cos k\theta & \sin k\theta\\ -\sin k\theta & \cos k\theta\end{bmatrix} && \text{...(i)}
\end{aligned}$$ -----------**[1 अंक]**

समी (i) के दोनों पक्षों को $A$ से गुणा करने पर,

$$\begin{aligned}
A^{k+1} = A^{k} \cdot A &= \begin{bmatrix}\cos k\theta & \sin k\theta\\ -\sin k\theta & \cos k\theta\end{bmatrix}\begin{bmatrix}\cos\theta & \sin\theta\\ -\sin\theta & \cos\theta\end{bmatrix}
\end{aligned}$$ -----------**[1 अंक]**

गुणनफल का हर अवयव अलग,

$$\begin{aligned}
C_{11} &= \cos k\theta\cos\theta - \sin k\theta\sin\theta = \cos(k+1)\theta \\
C_{12} &= \cos k\theta\sin\theta + \sin k\theta\cos\theta = \sin(k+1)\theta \\
C_{21} &= -\sin k\theta\cos\theta - \cos k\theta\sin\theta = -\sin(k+1)\theta \\
C_{22} &= -\sin k\theta\sin\theta + \cos k\theta\cos\theta = \cos(k+1)\theta
\end{aligned}$$ -----------**[1 अंक]**
$$\begin{aligned}
A^{k+1} &= \begin{bmatrix}\cos(k+1)\theta & \sin(k+1)\theta\\ -\sin(k+1)\theta & \cos(k+1)\theta\end{bmatrix}
\end{aligned}$$

यानी कथन $n = k$ के लिए सत्य मानने पर वह $n = k+1$ के लिए भी सत्य निकलता है, और $n = 1$ के लिए वह सत्य है ही; इसलिए वह हर $n \in N$ के लिए सत्य है।

$$\therefore\; \boxed{A^{n} = \begin{bmatrix}\cos n\theta & \sin n\theta\\ -\sin n\theta & \cos n\theta\end{bmatrix}},\ n \in N$$ -----------**[1 अंक]**

इति सिद्धम्

🛟 **कुछ याद न आए तो** — पूरा न सूझे तो भी $n=1$ पर जाँच और $n=k$ की मान्यता लिख दो; उपपत्ति यहीं से खुलती है।

#### पुराने वर्ष

> साल पुस्तक के दर्ज किए हैं, सेट-कोड नहीं।

**प्र. 74**  `[5 अंक · 2019 · विस्तृत उत्तरीय प्रश्न]`

**यदि $A = \begin{bmatrix} -2 \\ 4 \\ 5 \end{bmatrix}$ तथा $B = [1 \ 3 \ -6]$ है, तो सत्यापित कीजिए**
**$(AB)' = B'A'$**

**उत्तर:** दिया है, $A = \begin{bmatrix} -2 \\ 4 \\ 5 \end{bmatrix}$, $B = \begin{bmatrix} 1 & 3 & -6 \end{bmatrix}$

$$\begin{aligned}
AB &= \begin{bmatrix} -2 \\ 4 \\ 5 \end{bmatrix} \cdot \begin{bmatrix} 1 & 3 & -6 \end{bmatrix} = \begin{bmatrix} -2 & -6 & 12 \\ 4 & 12 & -24 \\ 5 & 15 & -30 \end{bmatrix}
\end{aligned}$$ -----------**[1 अंक]**
$$\begin{aligned}
(AB)' &= \begin{bmatrix} -2 & -6 & 12 \\ 4 & 12 & -24 \\ 5 & 15 & -30 \end{bmatrix}' = \begin{bmatrix} -2 & 4 & 5 \\ -6 & 12 & 15 \\ 12 & -24 & -30 \end{bmatrix} && \text{...(i)}
\end{aligned}$$ -----------**[2 अंक]**

तथा

$$\begin{aligned}
B'A' &= \begin{bmatrix} 1 & 3 & -6 \end{bmatrix}'\begin{bmatrix} -2 \\ 4 \\ 5 \end{bmatrix}' = \begin{bmatrix} 1 \\ 3 \\ -6 \end{bmatrix}\begin{bmatrix} -2 & 4 & 5 \end{bmatrix} \\
B'A' &= \begin{bmatrix} -2 & 4 & 5 \\ -6 & 12 & 15 \\ 12 & -24 & -30 \end{bmatrix} && \text{...(ii)}
\end{aligned}$$

समी (i) व (ii) से,

$$\therefore\; \boxed{(AB)' = B'A'}$$ -----------**[2 अंक]**

#### पुस्तक से

**प्र. 75**  `[5 अंक · विस्तृत उत्तरीय प्रश्न]`

**यदि $A = \begin{bmatrix} 2 & 3 \\ -1 & 2 \end{bmatrix}$, तो दिखाइए कि $A^2 - 4A + 7I = O$**
**इस परिणाम का प्रयोग करके $A^5$ का मान भी निकालिए। [NCERT Exemplar]**

**उत्तर:** $A^5 = \begin{bmatrix} -118 & -93 \\ 31 & -118 \end{bmatrix}$

दिया है, $A = \begin{bmatrix}2 & 3\\ -1 & 2\end{bmatrix}$ तथा $I = \begin{bmatrix}1 & 0\\ 0 & 1\end{bmatrix}$

$$\begin{aligned}
A^{2} = A \cdot A &= \begin{bmatrix}2 & 3\\ -1 & 2\end{bmatrix}\begin{bmatrix}2 & 3\\ -1 & 2\end{bmatrix} \\
&= \begin{bmatrix}4-3 & 6+6\\ -2-2 & -3+4\end{bmatrix} \\
&= \begin{bmatrix}1 & 12\\ -4 & 1\end{bmatrix}
\end{aligned}$$

अब अदिश-गुणन करने पर,

$$\begin{aligned}
4A &= \begin{bmatrix}8 & 12\\ -4 & 8\end{bmatrix} \\
7I &= \begin{bmatrix}7 & 0\\ 0 & 7\end{bmatrix}
\end{aligned}$$

संगत अवयव जोड़ने-घटाने पर,

$$\begin{aligned}
A^{2} - 4A + 7I &= \begin{bmatrix}1 & 12\\ -4 & 1\end{bmatrix} - \begin{bmatrix}8 & 12\\ -4 & 8\end{bmatrix} + \begin{bmatrix}7 & 0\\ 0 & 7\end{bmatrix} \\
&= \begin{bmatrix}1-8+7 & 12-12+0\\ -4+4+0 & 1-8+7\end{bmatrix} \\
&= \begin{bmatrix}0 & 0\\ 0 & 0\end{bmatrix} = O
\end{aligned}$$

इति सिद्धम् -----------**[2 अंक]**

इसी परिणाम से $A^{2} = 4A - 7I$; इसे बार-बार $A$ से गुणा करने पर,

$$\begin{aligned}
A^{3} = A \cdot A^{2} &= 4A^{2} - 7A \\
&= 4(4A - 7I) - 7A \\
&= 9A - 28I \\
A^{4} = A \cdot A^{3} &= 9A^{2} - 28A \\
&= 9(4A - 7I) - 28A \\
&= 8A - 63I \\
A^{5} = A \cdot A^{4} &= 8A^{2} - 63A \\
&= 8(4A - 7I) - 63A \\
&= -31A - 56I
\end{aligned}$$

$A$ तथा $I$ के मान रखने पर,

$$\begin{aligned}
A^{5} &= \begin{bmatrix}-62 & -93\\ 31 & -62\end{bmatrix} - \begin{bmatrix}56 & 0\\ 0 & 56\end{bmatrix} \\
&= \begin{bmatrix}-62-56 & -93-0\\ 31-0 & -62-56\end{bmatrix}
\end{aligned}$$

$$\therefore\; \boxed{A^{5} = \begin{bmatrix}-118 & -93\\ 31 & -118\end{bmatrix}}$$ -----------**[3 अंक]**

🧠 **पूरा जवाब इसी एक लाइन में है** — सिद्ध किए हुए $A^{2}=4A-7I$ को बार-बार $A$ से गुणा करते जाओ; ऊँची घात इसी चाल से निकलती है।

### दीर्घ उत्तरीय प्रश्न (8 अंक)

#### 2026

#### शर्त $CD-AB=O$ से आव्यूह $D$
**प्र. 76**  `[8 अंक · 2026/set_d_cx प्र.37]`  *यही सवाल 5 अंक पर प्र. 69 में*


**मान लीजिए कि $A=\begin{bmatrix}2 & -1 \\ 3 & 4\end{bmatrix},\ B=\begin{bmatrix}5 & 2 \\ 7 & 4\end{bmatrix},\ C=\begin{bmatrix}2 & 5 \\ 3 & 8\end{bmatrix}$ हैं। एक आव्यूह $D$ ज्ञात कीजिए कि $CD-AB=O$ हो।**

**उत्तर:** क्योंकि $A$, $B$, $C$ सभी कोटि 2 के वर्ग आव्यूह हैं और $CD - AB$ भली-भाँति परिभाषित है, इसलिए $D$ कोटि 2 का एक वर्ग आव्यूह होना चाहिए।

मान लीजिए कि, $D = \begin{bmatrix}a & b\\ c & d\end{bmatrix}$ है। तब $CD - AB = O$ से प्राप्त होता है

$$\begin{aligned}
\begin{bmatrix}2 & 5\\ 3 & 8\end{bmatrix} \begin{bmatrix}a & b\\ c & d\end{bmatrix} - \begin{bmatrix}2 & -1\\ 3 & 4\end{bmatrix} \begin{bmatrix}5 & 2\\ 7 & 4\end{bmatrix} &= O \\
\begin{bmatrix}2a + 5c & 2b + 5d\\ 3a + 8c & 3b + 8d\end{bmatrix} - \begin{bmatrix}3 & 0\\ 43 & 22\end{bmatrix} &= \begin{bmatrix}0 & 0\\ 0 & 0\end{bmatrix} \\
\begin{bmatrix}2a + 5c - 3 & 2b + 5d\\ 3a + 8c - 43 & 3b + 8d - 22\end{bmatrix} &= \begin{bmatrix}0 & 0\\ 0 & 0\end{bmatrix}
\end{aligned}$$ -----------**[2 अंक]**

आव्यूह की समानता से हमें निम्नलिखित समीकरण प्राप्त होते हैं:

$$\begin{aligned}
2a + 5c - 3 &= 0 && \text{...(i)} \\
3a + 8c - 43 &= 0 && \text{...(ii)} \\
2b + 5d &= 0 && \text{...(iii)} \\
3b + 8d - 22 &= 0 && \text{...(iv)}
\end{aligned}$$ -----------**[2 अंक]**

समी (i) को 3 से तथा समी (ii) को 2 से गुणा करने पर,

$$\begin{aligned}
6a + 15c &= 9 \\
6a + 16c &= 86
\end{aligned}$$

पहली को दूसरी में से घटाने पर $c = 77$, और यह मान समी (i) में रखने पर

$$2a + 5(77) = 3 \;\Rightarrow\; 2a = 3 - 385 = -382 \;\Rightarrow\; a = -191$$ -----------**[1 अंक]**

समी (iii) को 3 से तथा समी (iv) को 2 से गुणा करने पर,

$$\begin{aligned}
6b + 15d &= 0 \\
6b + 16d &= 44
\end{aligned}$$

पहली को दूसरी में से घटाने पर $d = 44$, और यह मान समी (iii) में रखने पर

$$2b + 5(44) = 0 \;\Rightarrow\; 2b = -220 \;\Rightarrow\; b = -110$$ -----------**[1 अंक]**

$$\therefore\; \boxed{D = \begin{bmatrix}a & b\\ c & d\end{bmatrix} = \begin{bmatrix}-191 & -110\\ 77 & 44\end{bmatrix}}$$ -----------**[1 अंक]**

जाँच: $CD$ तथा $AB$ अलग-अलग निकालने पर दोनों बराबर आने चाहिए,

$$\begin{aligned}
CD &= \begin{bmatrix}2 & 5\\ 3 & 8\end{bmatrix}\begin{bmatrix}-191 & -110\\ 77 & 44\end{bmatrix} = \begin{bmatrix}-382+385 & -220+220\\ -573+616 & -330+352\end{bmatrix} = \begin{bmatrix}3 & 0\\ 43 & 22\end{bmatrix} \\
AB &= \begin{bmatrix}2 & -1\\ 3 & 4\end{bmatrix}\begin{bmatrix}5 & 2\\ 7 & 4\end{bmatrix} = \begin{bmatrix}10-7 & 4-4\\ 15+28 & 6+16\end{bmatrix} = \begin{bmatrix}3 & 0\\ 43 & 22\end{bmatrix} \\
\therefore\; CD - AB &= O
\end{aligned}$$

अतः निकाला हुआ $D = \begin{bmatrix}-191 & -110\\ 77 & 44\end{bmatrix}$ सही है। -----------**[1 अंक]**

#### 2025

#### $3\times3$ घूर्णन आव्यूह पर $F(x)\,F(y)=F(x+y)$ की उपपत्ति
**प्र. 77**  `[8 अंक · 2025/set_b_jb प्र.38]`  *यही सवाल 2 अंक पर प्र. 47 में*


**यदि $F(x)=\begin{bmatrix}\cos x & -\sin x & 0 \\ \sin x & \cos x & 0 \\ 0 & 0 & 1\end{bmatrix}$, तो सिद्ध कीजिए कि $F(x)\,F(y)=F(x+y)$.**

**उत्तर:** बायाँ पक्ष $= F(x) \cdot F(y)$

$$F(x) \cdot F(y) = \begin{bmatrix} \cos x & -\sin x & 0 \\ \sin x & \cos x & 0 \\ 0 & 0 & 1 \end{bmatrix}\begin{bmatrix} \cos y & -\sin y & 0 \\ \sin y & \cos y & 0 \\ 0 & 0 & 1 \end{bmatrix}$$ -----------**[2 अंक]**

गुणनफल का हर अवयव अलग-अलग,

$$\begin{aligned}
C_{11} &= \cos x \cos y - \sin x \sin y + 0 = \cos(x+y) \\
C_{12} &= -\cos x \sin y - \sin x \cos y + 0 = -\sin(x+y) \\
C_{21} &= \sin x \cos y + \cos x \sin y + 0 = \sin(x+y) \\
C_{22} &= -\sin x \sin y + \cos x \cos y + 0 = \cos(x+y) \\
C_{13} = C_{23} = C_{31} = C_{32} &= 0+0+0 = 0 \\
C_{33} &= 0+0+1 = 1
\end{aligned}$$ -----------**[3 अंक]**

$$F(x) \cdot F(y) = \begin{bmatrix} \cos(x+y) & -\sin(x+y) & 0 \\ \sin(x+y) & \cos(x+y) & 0 \\ 0 & 0 & 1 \end{bmatrix} = F(x+y) = \text{दायाँ पक्ष}$$ -----------**[2 अंक]**

$$\therefore\; \boxed{F(x) \cdot F(y) = F(x+y)}$$ -----------**[1 अंक]**

इति सिद्धम्

🧮 **calculation सँभालो, ग़लती यहीं होती है** — तीसरी पंक्ति और तीसरा स्तम्भ सिर्फ़ शून्य और 1 देते हैं; असली काम ऊपर के चार अवयवों पर है।

#### $A^{3}-6A^{2}+5A+11I=0$ का सत्यापन तथा उससे $A^{-1}$
**प्र. 78**  `[8 अंक · 2025/set_d_jd प्र.37]`

**आव्यूह $A=\begin{bmatrix}1&1&1\\1&2&-3\\2&-1&3\end{bmatrix}$ के लिए दर्शाइए कि $A^{3}-6A^{2}+5A+11I=0$ है। इसकी सहायता से $A^{-1}$ ज्ञात कीजिए।**

**उत्तर:**
दिया है, $A = \begin{bmatrix}1 & 1 & 1\\ 1 & 2 & -3\\ 2 & -1 & 3\end{bmatrix}$

$$\begin{aligned}
A^{2} = A \cdot A &= \begin{bmatrix}1 & 1 & 1\\ 1 & 2 & -3\\ 2 & -1 & 3\end{bmatrix}\begin{bmatrix}1 & 1 & 1\\ 1 & 2 & -3\\ 2 & -1 & 3\end{bmatrix} \\
&= \begin{bmatrix}1+1+2 & 1+2-1 & 1-3+3\\ 1+2-6 & 1+4+3 & 1-6-9\\ 2-1+6 & 2-2-3 & 2+3+9\end{bmatrix} \\
&= \begin{bmatrix}4 & 2 & 1\\ -3 & 8 & -14\\ 7 & -3 & 14\end{bmatrix}
\end{aligned}$$ -----------**[2 अंक]**
$$\begin{aligned}
A^{3} = A^{2} \cdot A &= \begin{bmatrix}4 & 2 & 1\\ -3 & 8 & -14\\ 7 & -3 & 14\end{bmatrix}\begin{bmatrix}1 & 1 & 1\\ 1 & 2 & -3\\ 2 & -1 & 3\end{bmatrix} \\
&= \begin{bmatrix}4+2+2 & 4+4-1 & 4-6+3\\ -3+8-28 & -3+16+14 & -3-24-42\\ 7-3+28 & 7-6-14 & 7+9+42\end{bmatrix} \\
&= \begin{bmatrix}8 & 7 & 1\\ -23 & 27 & -69\\ 32 & -13 & 58\end{bmatrix}
\end{aligned}$$ -----------**[2 अंक]**

अब अदिश-गुणन करने पर,

$$\begin{aligned}
6A^{2} &= \begin{bmatrix}24 & 12 & 6\\ -18 & 48 & -84\\ 42 & -18 & 84\end{bmatrix} \\
5A &= \begin{bmatrix}5 & 5 & 5\\ 5 & 10 & -15\\ 10 & -5 & 15\end{bmatrix} \\
11I &= \begin{bmatrix}11 & 0 & 0\\ 0 & 11 & 0\\ 0 & 0 & 11\end{bmatrix}
\end{aligned}$$

$A^{3} - 6A^{2} + 5A + 11I$ का हर अवयव अलग,

$$\begin{aligned}
C_{11} &= 8-24+5+11 = 0 \\
C_{12} &= 7-12+5+0 = 0 \\
C_{13} &= 1-6+5+0 = 0 \\
C_{21} &= -23+18+5+0 = 0 \\
C_{22} &= 27-48+10+11 = 0 \\
C_{23} &= -69+84-15+0 = 0 \\
C_{31} &= 32-42+10+0 = 0 \\
C_{32} &= -13+18-5+0 = 0 \\
C_{33} &= 58-84+15+11 = 0
\end{aligned}$$

$$\therefore\; \boxed{A^{3} - 6A^{2} + 5A + 11I = O}$$ -----------**[2 अंक]**

इति सिद्धम्

इसी सिद्ध किए हुए समीकरण के दोनों पक्षों को $A^{-1}$ से गुणा करने पर,

$$\begin{aligned}
A^{2} - 6A + 5I + 11A^{-1} &= O && [\because A \cdot A^{-1} = I] \\
11A^{-1} &= 6A - A^{2} - 5I
\end{aligned}$$ -----------**[1 अंक]**

संगत अवयव घटाने पर,

$$\begin{aligned}
6A - A^{2} &= \begin{bmatrix}6-4 & 6-2 & 6-1\\ 6+3 & 12-8 & -18+14\\ 12-7 & -6+3 & 18-14\end{bmatrix} \\
&= \begin{bmatrix}2 & 4 & 5\\ 9 & 4 & -4\\ 5 & -3 & 4\end{bmatrix} \\
11A^{-1} &= \begin{bmatrix}2-5 & 4 & 5\\ 9 & 4-5 & -4\\ 5 & -3 & 4-5\end{bmatrix} \\
&= \begin{bmatrix}-3 & 4 & 5\\ 9 & -1 & -4\\ 5 & -3 & -1\end{bmatrix}
\end{aligned}$$

$$\therefore\; \boxed{A^{-1} = \frac{1}{11}\begin{bmatrix}-3 & 4 & 5\\ 9 & -1 & -4\\ 5 & -3 & -1\end{bmatrix}}$$ -----------**[1 अंक]**

🧮 **calculation सँभालो, ग़लती यहीं होती है** — $11A^{-1}$ अलग करने के बाद 11 से भाग देना बाक़ी है; वह भूलने पर उत्तर ग्यारह गुना बड़ा होगा।

#### 2023

#### $A^{2}-4A+I_{2}=0$ का सत्यापन तथा उससे $A^{-1}$
**प्र. 79**  `[4 अंक · 2023/set_d_ay प्र.37]`  *यही सवाल 8 अंक पर प्र. 87 में*
*पुराने ढाँचे (2023 तक) का 4-अंक खण्ड — पेपर में इसका जोड़ीदार खण्ड प्राय: दूसरे अध्याय का था; आज का पेपर इसी जगह 8 अंक का एक खण्ड पूछता है।*

**सिद्ध कीजिए कि आव्यूह $A=\begin{bmatrix}2 & 3 \\ 1 & 2\end{bmatrix}$ समीकरण $A^{2}-4A+I_{2}=0$ को संतुष्ट करता है जहाँ $I_{2}$ एक $2\times2$ तद्समक आव्यूह तथा $O$ एक $2\times2$ शून्य आव्यूह है। इसकी सहायता से $A^{-1}$ ज्ञात कीजिए।**

**उत्तर:** दिया है, $A = \begin{bmatrix} 2 & 3 \\ 1 & 2 \end{bmatrix}$

$$\begin{aligned}
A^2 = A \cdot A &= \begin{bmatrix} 2 & 3 \\ 1 & 2 \end{bmatrix}\begin{bmatrix} 2 & 3 \\ 1 & 2 \end{bmatrix} \\
&= \begin{bmatrix} 4+3 & 6+6 \\ 2+2 & 3+4 \end{bmatrix} = \begin{bmatrix} 7 & 12 \\ 4 & 7 \end{bmatrix}
\end{aligned}$$ -----------**[1 अंक]**
$$\begin{aligned}
\text{बायाँ पक्ष} = A^2 - 4A + I_2 &= \begin{bmatrix} 7 & 12 \\ 4 & 7 \end{bmatrix} - 4\begin{bmatrix} 2 & 3 \\ 1 & 2 \end{bmatrix} + \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} \\
&= \begin{bmatrix} 7 & 12 \\ 4 & 7 \end{bmatrix} + \begin{bmatrix} -8 & -12 \\ -4 & -8 \end{bmatrix} + \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} \\
&= \begin{bmatrix} 7-8+1 & 12-12+0 \\ 4-4+0 & 7-8+1 \end{bmatrix} = \begin{bmatrix} 0 & 0 \\ 0 & 0 \end{bmatrix} = O = \text{दायाँ पक्ष}
\end{aligned}$$ -----------**[1 अंक]**

$\because A^2 - 4A + I_2 = O$, $A^{-1}$ से दोनों पक्षों में गुणा करने पर,

$$\begin{aligned}
A - 4AA^{-1} + A^{-1} &= O \\
A - 4I_2 + A^{-1} &= O \\
A^{-1} &= 4I_2 - A \\
&= 4\begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} - \begin{bmatrix} 2 & 3 \\ 1 & 2 \end{bmatrix} \\
&= \begin{bmatrix} 4 & 0 \\ 0 & 4 \end{bmatrix} - \begin{bmatrix} 2 & 3 \\ 1 & 2 \end{bmatrix} = \begin{bmatrix} 4-2 & 0-3 \\ 0-1 & 4-2 \end{bmatrix}
\end{aligned}$$ -----------**[1 अंक]**

$$\therefore\; \boxed{A^{-1} = \begin{bmatrix} 2 & -3 \\ -1 & 2 \end{bmatrix}}$$ -----------**[1 अंक]**

#### प्रारम्भिक रूपान्तरणों से $A=\begin{bmatrix}2&0&-1\\5&1&0\\0&1&3\end{bmatrix}$ का व्युत्क्रम
**प्र. 80**  `[8 अंक · 2023/set_c_ax प्र.42]`

**प्रारम्भिक रूपान्तरणों के द्वारा आव्यूह $A=\begin{bmatrix}2&0&-1\\5&1&0\\0&1&3\end{bmatrix}$ का व्युत्क्रम ज्ञात कीजिए।**

**उत्तर:**
प्रारम्भिक पंक्ति-रूपान्तरणों के लिए $A = IA$ लिखने पर,

$$\begin{aligned}
\begin{bmatrix}2 & 0 & -1\\ 5 & 1 & 0\\ 0 & 1 & 3\end{bmatrix} &= \begin{bmatrix}1 & 0 & 0\\ 0 & 1 & 0\\ 0 & 0 & 1\end{bmatrix}A
\end{aligned}$$ -----------**[1 अंक]**

$R_{2} \to R_{2} - 2R_{1}$ करने पर,

$$\begin{aligned}
\begin{bmatrix}2 & 0 & -1\\ 1 & 1 & 2\\ 0 & 1 & 3\end{bmatrix} &= \begin{bmatrix}1 & 0 & 0\\ -2 & 1 & 0\\ 0 & 0 & 1\end{bmatrix}A
\end{aligned}$$ -----------**[1 अंक]**

$R_{1} \leftrightarrow R_{2}$ करने पर,

$$\begin{aligned}
\begin{bmatrix}1 & 1 & 2\\ 2 & 0 & -1\\ 0 & 1 & 3\end{bmatrix} &= \begin{bmatrix}-2 & 1 & 0\\ 1 & 0 & 0\\ 0 & 0 & 1\end{bmatrix}A
\end{aligned}$$ -----------**[1 अंक]**

$R_{2} \to R_{2} - 2R_{1}$ करने पर,

$$\begin{aligned}
\begin{bmatrix}1 & 1 & 2\\ 0 & -2 & -5\\ 0 & 1 & 3\end{bmatrix} &= \begin{bmatrix}-2 & 1 & 0\\ 5 & -2 & 0\\ 0 & 0 & 1\end{bmatrix}A
\end{aligned}$$ -----------**[1 अंक]**

$R_{2} \leftrightarrow R_{3}$ करने पर,

$$\begin{aligned}
\begin{bmatrix}1 & 1 & 2\\ 0 & 1 & 3\\ 0 & -2 & -5\end{bmatrix} &= \begin{bmatrix}-2 & 1 & 0\\ 0 & 0 & 1\\ 5 & -2 & 0\end{bmatrix}A
\end{aligned}$$ -----------**[1 अंक]**

$R_{1} \to R_{1} - R_{2}$ तथा $R_{3} \to R_{3} + 2R_{2}$ करने पर,

$$\begin{aligned}
\begin{bmatrix}1 & 0 & -1\\ 0 & 1 & 3\\ 0 & 0 & 1\end{bmatrix} &= \begin{bmatrix}-2 & 1 & -1\\ 0 & 0 & 1\\ 5 & -2 & 2\end{bmatrix}A
\end{aligned}$$ -----------**[1 अंक]**

$R_{1} \to R_{1} + R_{3}$ तथा $R_{2} \to R_{2} - 3R_{3}$ करने पर,

$$\begin{aligned}
\begin{bmatrix}1 & 0 & 0\\ 0 & 1 & 0\\ 0 & 0 & 1\end{bmatrix} &= \begin{bmatrix}3 & -1 & 1\\ -15 & 6 & -5\\ 5 & -2 & 2\end{bmatrix}A
\end{aligned}$$ -----------**[1 अंक]**

बाएँ पक्ष में तत्समक आव्यूह $I$ आ गया, इसलिए दाएँ पक्ष का आव्यूह ही $A^{-1}$ है।

$$\therefore\; \boxed{A^{-1} = \begin{bmatrix}3 & -1 & 1\\ -15 & 6 & -5\\ 5 & -2 & 2\end{bmatrix}}$$ -----------**[1 अंक]**

⚠ **बोर्ड यहीं फँसाता है** — $A=IA$ लिखकर हर संक्रिया दोनों पक्षों पर लगाओ, और सिर्फ़ पंक्ति वाली; स्तम्भ वाली हल बिगाड़ देती है।

🔗 **यह वही सवाल है** — यही प्रारम्भिक संक्रियाओं वाला व्युत्क्रम प्र. 82 और प्र. 84 में भी है; एक बार कर लो तो तीनों हो जाएँगे।

#### 2022

#### $A^{3}-6A^{2}+7A+2I=0$ की उपपत्ति
**प्र. 81**  `[4 अंक · 2022/set_a_ff प्र.37]`  *यही सवाल 5 अंक पर प्र. 71 में*

*पुराने ढाँचे (2023 तक) का 4-अंक खण्ड — पेपर में इसका जोड़ीदार खण्ड प्राय: दूसरे अध्याय का था; आज का पेपर इसी जगह 8 अंक का एक खण्ड पूछता है।*

**यदि $A=\begin{bmatrix}1&0&2\\0&2&1\\2&0&3\end{bmatrix}$, तो सिद्ध कीजिए कि $A^{3}-6A^{2}+7A+2I=0$।**

⚠️ पेपर में यह प्रश्न दो खण्डों का एक ही डिब्बा है और उस पर छपे 4 अंक दोनों खण्डों के हैं; दूसरा खण्ड अवकलज के अनुप्रयोग का है, इसलिए यहाँ केवल आव्यूह वाला खण्ड रखा गया है।

**उत्तर:** यहाँ,

$$\begin{aligned}
A^2 = A \times A &= \begin{bmatrix} 1 & 0 & 2 \\ 0 & 2 & 1 \\ 2 & 0 & 3 \end{bmatrix}\begin{bmatrix} 1 & 0 & 2 \\ 0 & 2 & 1 \\ 2 & 0 & 3 \end{bmatrix} \\
&= \begin{bmatrix} 1+0+4 & 0+0+0 & 2+0+6 \\ 0+0+2 & 0+4+0 & 0+2+3 \\ 2+0+6 & 0+0+0 & 4+0+9 \end{bmatrix} = \begin{bmatrix} 5 & 0 & 8 \\ 2 & 4 & 5 \\ 8 & 0 & 13 \end{bmatrix}
\end{aligned}$$ -----------**[1 अंक]**
$$\begin{aligned}
A^3 = A^2 \times A &= \begin{bmatrix} 5 & 0 & 8 \\ 2 & 4 & 5 \\ 8 & 0 & 13 \end{bmatrix}\begin{bmatrix} 1 & 0 & 2 \\ 0 & 2 & 1 \\ 2 & 0 & 3 \end{bmatrix} \\
&= \begin{bmatrix} 5+0+16 & 0+0+0 & 10+0+24 \\ 2+0+10 & 0+8+0 & 4+4+15 \\ 8+0+26 & 0+0+0 & 16+0+39 \end{bmatrix} = \begin{bmatrix} 21 & 0 & 34 \\ 12 & 8 & 23 \\ 34 & 0 & 55 \end{bmatrix}
\end{aligned}$$ -----------**[1 अंक]**
$$\begin{aligned}
A^3 - 6A^2 + 7A + 2I &= \begin{bmatrix} 21 & 0 & 34 \\ 12 & 8 & 23 \\ 34 & 0 & 55 \end{bmatrix} - 6\begin{bmatrix} 5 & 0 & 8 \\ 2 & 4 & 5 \\ 8 & 0 & 13 \end{bmatrix} + 7\begin{bmatrix} 1 & 0 & 2 \\ 0 & 2 & 1 \\ 2 & 0 & 3 \end{bmatrix} + 2\begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{bmatrix} \\
&= \begin{bmatrix} 21 & 0 & 34 \\ 12 & 8 & 23 \\ 34 & 0 & 55 \end{bmatrix} - \begin{bmatrix} 30 & 0 & 48 \\ 12 & 24 & 30 \\ 48 & 0 & 78 \end{bmatrix} + \begin{bmatrix} 7 & 0 & 14 \\ 0 & 14 & 7 \\ 14 & 0 & 21 \end{bmatrix} + \begin{bmatrix} 2 & 0 & 0 \\ 0 & 2 & 0 \\ 0 & 0 & 2 \end{bmatrix} \\
&= \begin{bmatrix} 21-30+7+2 & 0-0+0+0 & 34-48+14+0 \\ 12-12+0+0 & 8-24+14+2 & 23-30+7+0 \\ 34-48+14+0 & 0-0+0+0 & 55-78+21+2 \end{bmatrix}
\end{aligned}$$ -----------**[1 अंक]**

$$\therefore\; \boxed{A^3 - 6A^2 + 7A + 2I = \begin{bmatrix} 0 & 0 & 0 \\ 0 & 0 & 0 \\ 0 & 0 & 0 \end{bmatrix} = O}$$ -----------**[1 अंक]**

इति सिद्धम्

#### प्रारम्भिक संक्रियाओं से $A=\begin{bmatrix}1&3&-2\\-3&0&-5\\2&5&0\end{bmatrix}$ का व्युत्क्रम
**प्र. 82**  `[4 अंक · 2022/set_a_ff प्र.39]`
*पुराने ढाँचे (2023 तक) का 4-अंक खण्ड — पेपर में इसका जोड़ीदार खण्ड प्राय: दूसरे अध्याय का था; आज का पेपर इसी जगह 8 अंक का एक खण्ड पूछता है।*

**प्रारम्भिक संक्रियाओं के प्रयोग द्वारा निम्नलिखित आव्यूह का व्युत्क्रम ज्ञात कीजिए : $A=\begin{bmatrix}1&3&-2\\-3&0&-5\\2&5&0\end{bmatrix}$**

**उत्तर:**
प्रारम्भिक पंक्ति-संक्रियाओं के लिए $A = IA$ लिखने पर,

$$\begin{aligned}
\begin{bmatrix}1 & 3 & -2\\ -3 & 0 & -5\\ 2 & 5 & 0\end{bmatrix} &= \begin{bmatrix}1 & 0 & 0\\ 0 & 1 & 0\\ 0 & 0 & 1\end{bmatrix}A
\end{aligned}$$ -----------**[1 अंक]**

$R_{2} \to R_{2} + 3R_{1}$ तथा $R_{3} \to R_{3} - 2R_{1}$ करने पर,

$$\begin{aligned}
\begin{bmatrix}1 & 3 & -2\\ 0 & 9 & -11\\ 0 & -1 & 4\end{bmatrix} &= \begin{bmatrix}1 & 0 & 0\\ 3 & 1 & 0\\ -2 & 0 & 1\end{bmatrix}A
\end{aligned}$$ -----------**[1 अंक]**

$R_{2} \leftrightarrow R_{3}$ तथा फिर $R_{2} \to -R_{2}$ करने पर,

$$\begin{aligned}
\begin{bmatrix}1 & 3 & -2\\ 0 & 1 & -4\\ 0 & 9 & -11\end{bmatrix} &= \begin{bmatrix}1 & 0 & 0\\ 2 & 0 & -1\\ 3 & 1 & 0\end{bmatrix}A
\end{aligned}$$

$R_{1} \to R_{1} - 3R_{2}$ तथा $R_{3} \to R_{3} - 9R_{2}$ करने पर,

$$\begin{aligned}
\begin{bmatrix}1 & 0 & 10\\ 0 & 1 & -4\\ 0 & 0 & 25\end{bmatrix} &= \begin{bmatrix}-5 & 0 & 3\\ 2 & 0 & -1\\ -15 & 1 & 9\end{bmatrix}A
\end{aligned}$$ -----------**[1 अंक]**

$R_{3} \to \dfrac{1}{25}R_{3}$ करने पर,

$$\begin{aligned}
\begin{bmatrix}1 & 0 & 10\\ 0 & 1 & -4\\ 0 & 0 & 1\end{bmatrix} &= \begin{bmatrix}-5 & 0 & 3\\ 2 & 0 & -1\\ -\frac{3}{5} & \frac{1}{25} & \frac{9}{25}\end{bmatrix}A
\end{aligned}$$

$R_{1} \to R_{1} - 10R_{3}$ तथा $R_{2} \to R_{2} + 4R_{3}$ करने पर,

$$\begin{aligned}
\begin{bmatrix}1 & 0 & 0\\ 0 & 1 & 0\\ 0 & 0 & 1\end{bmatrix} &= \frac{1}{25}\begin{bmatrix}25 & -10 & -15\\ -10 & 4 & 11\\ -15 & 1 & 9\end{bmatrix}A
\end{aligned}$$

बाएँ पक्ष में तत्समक आव्यूह $I$ आ गया, इसलिए दाएँ पक्ष का आव्यूह ही $A^{-1}$ है।

$$\therefore\; \boxed{A^{-1} = \frac{1}{25}\begin{bmatrix}25 & -10 & -15\\ -10 & 4 & 11\\ -15 & 1 & 9\end{bmatrix}}$$ -----------**[1 अंक]**

#### पंक्ति, वर्ग तथा स्तम्भ आव्यूहों के गुणनफल से $x$ का मान
**प्र. 83**  `[8 अंक · 2022/set_b_fh प्र.38]`  *यही सवाल 2 अंक पर प्र. 50 में*


**यदि $[x-5-1]\begin{bmatrix}1&0&2\\0&2&1\\2&0&3\end{bmatrix}\begin{bmatrix}x\\4\\1\end{bmatrix}=0$ है, तो $x$ का मान ज्ञात कीजिए।**

⚠ **स्रोत-नोट:** प्रश्नपत्र की नक़ल में पहला आव्यूह `[x-5-1]` छपा है, जो पढ़ने में $x-5-1$ जैसा लगता है। वह पंक्ति-आव्यूह $\begin{bmatrix} x & -5 & -1 \end{bmatrix}$ है; इसी रूप में गुणनफल परिभाषित होता है, और हल उसी को लेकर चला है। प्रश्न जैसा छपा है वैसा ही रखा गया है।

**उत्तर:** दिया है, $\begin{bmatrix} x & -5 & -1 \end{bmatrix}\begin{bmatrix} 1 & 0 & 2 \\ 0 & 2 & 1 \\ 2 & 0 & 3 \end{bmatrix}\begin{bmatrix} x \\ 4 \\ 1 \end{bmatrix} = 0$

पहले गुणनफल का हर अवयव अलग-अलग,

$$\begin{aligned}
C_{11} &= x \times 1 + (-5) \times 0 + (-1) \times 2 = x - 2 \\
C_{12} &= x \times 0 + (-5) \times 2 + (-1) \times 0 = -10 \\
C_{13} &= x \times 2 + (-5) \times 1 + (-1) \times 3 = 2x - 8
\end{aligned}$$ -----------**[2 अंक]**

$$\begin{bmatrix} x - 2 & -10 & 2x - 8 \end{bmatrix}\begin{bmatrix} x \\ 4 \\ 1 \end{bmatrix} = 0$$ -----------**[2 अंक]**

$$\begin{aligned}
(x - 2) \times x + (-10) \times 4 + (2x - 8) \times 1 &= 0 \\
x^2 - 2x - 40 + 2x - 8 &= 0 \\
x^2 &= 48 \\
x &= \pm\sqrt{48}
\end{aligned}$$ -----------**[2 अंक]**

$$\therefore\; \boxed{x = \pm 4\sqrt{3}}$$ -----------**[1 अंक]**

जाँच: सरल करने पर $x$ का रैखिक पद कट गया और $x^{2} - 48 = 0$ बचा, इसलिए दोनों चिह्न समीकरण को सन्तुष्ट करते हैं। $x = -4\sqrt{3}$ रखने पर भी

$$(-4\sqrt{3})^{2} - 48 = 48 - 48 = 0$$ -----------**[1 अंक]**

#### 2020

#### प्रारम्भिक संक्रियाओं से $A=\begin{bmatrix}0&1&2\\1&2&3\\3&1&1\end{bmatrix}$ का व्युत्क्रम
**प्र. 84**  `[4 अंक · 2020/set_c_xc प्र.24]`
*पुराने ढाँचे (2023 तक) का 4-अंक खण्ड — पेपर में इसका जोड़ीदार खण्ड प्राय: दूसरे अध्याय का था; आज का पेपर इसी जगह 8 अंक का एक खण्ड पूछता है।*

**प्रारम्भिक संक्रियाओं के प्रयोग से**
**$A=\begin{bmatrix}0&1&2\\1&2&3\\3&1&1\end{bmatrix}$ का व्युत्क्रम प्राप्त कीजिए।**

**उत्तर:**
प्रारम्भिक पंक्ति-संक्रियाओं के लिए $A = IA$ लिखने पर,

$$\begin{aligned}
\begin{bmatrix}0 & 1 & 2\\ 1 & 2 & 3\\ 3 & 1 & 1\end{bmatrix} &= \begin{bmatrix}1 & 0 & 0\\ 0 & 1 & 0\\ 0 & 0 & 1\end{bmatrix}A
\end{aligned}$$ -----------**[1 अंक]**

$R_{1} \leftrightarrow R_{2}$ करने पर,

$$\begin{aligned}
\begin{bmatrix}1 & 2 & 3\\ 0 & 1 & 2\\ 3 & 1 & 1\end{bmatrix} &= \begin{bmatrix}0 & 1 & 0\\ 1 & 0 & 0\\ 0 & 0 & 1\end{bmatrix}A
\end{aligned}$$

$R_{3} \to R_{3} - 3R_{1}$ करने पर,

$$\begin{aligned}
\begin{bmatrix}1 & 2 & 3\\ 0 & 1 & 2\\ 0 & -5 & -8\end{bmatrix} &= \begin{bmatrix}0 & 1 & 0\\ 1 & 0 & 0\\ 0 & -3 & 1\end{bmatrix}A
\end{aligned}$$ -----------**[1 अंक]**

$R_{1} \to R_{1} - 2R_{2}$ तथा $R_{3} \to R_{3} + 5R_{2}$ करने पर,

$$\begin{aligned}
\begin{bmatrix}1 & 0 & -1\\ 0 & 1 & 2\\ 0 & 0 & 2\end{bmatrix} &= \begin{bmatrix}-2 & 1 & 0\\ 1 & 0 & 0\\ 5 & -3 & 1\end{bmatrix}A
\end{aligned}$$

$R_{3} \to \dfrac{1}{2}R_{3}$ करने पर,

$$\begin{aligned}
\begin{bmatrix}1 & 0 & -1\\ 0 & 1 & 2\\ 0 & 0 & 1\end{bmatrix} &= \begin{bmatrix}-2 & 1 & 0\\ 1 & 0 & 0\\ \frac{5}{2} & -\frac{3}{2} & \frac{1}{2}\end{bmatrix}A
\end{aligned}$$ -----------**[1 अंक]**

$R_{1} \to R_{1} + R_{3}$ तथा $R_{2} \to R_{2} - 2R_{3}$ करने पर,

$$\begin{aligned}
\begin{bmatrix}1 & 0 & 0\\ 0 & 1 & 0\\ 0 & 0 & 1\end{bmatrix} &= \begin{bmatrix}\frac{1}{2} & -\frac{1}{2} & \frac{1}{2}\\ -4 & 3 & -1\\ \frac{5}{2} & -\frac{3}{2} & \frac{1}{2}\end{bmatrix}A
\end{aligned}$$

बाएँ पक्ष में तत्समक आव्यूह $I$ आ गया, इसलिए दाएँ पक्ष का आव्यूह ही $A^{-1}$ है।

$$\therefore\; \boxed{A^{-1} = \begin{bmatrix}\frac{1}{2} & -\frac{1}{2} & \frac{1}{2}\\ -4 & 3 & -1\\ \frac{5}{2} & -\frac{3}{2} & \frac{1}{2}\end{bmatrix}}$$ -----------**[1 अंक]**

#### पुराने वर्ष

> साल पुस्तक के दर्ज किए हैं, सेट-कोड नहीं।

**प्र. 85**  `[8 अंक · 2025 · 2024 · 2017 · NCERT · दीर्घ उत्तरीय प्रश्न]`

**यदि आव्यूह $A = \begin{bmatrix} 0 & 2y & z \\ x & y & -z \\ x & -y & z \end{bmatrix}$, $A'A = I$ को सन्तुष्ट करता है, तो $x, y, z$ के मान ज्ञात कीजिए।**

**उत्तर:** दिया है, $A = \begin{bmatrix} 0 & 2y & z \\ x & y & -z \\ x & -y & z \end{bmatrix}$

तब,

$$A' = \begin{bmatrix} 0 & 2y & z \\ x & y & -z \\ x & -y & z \end{bmatrix}' = \begin{bmatrix} 0 & x & x \\ 2y & y & -y \\ z & -z & z \end{bmatrix}$$

$$A'A = \begin{bmatrix} 0 & x & x \\ 2y & y & -y \\ z & -z & z \end{bmatrix}\begin{bmatrix} 0 & 2y & z \\ x & y & -z \\ x & -y & z \end{bmatrix}$$

गुणनफल का हर अवयव अलग-अलग,

$$\begin{aligned}
C_{11} &= 0 + x^2 + x^2 = 2x^2 \\
C_{22} &= 4y^2 + y^2 + y^2 = 6y^2 \\
C_{33} &= z^2 + z^2 + z^2 = 3z^2 \\
C_{12} = C_{21} &= 0 + xy - xy = 0 \\
C_{13} = C_{31} &= 0 - xz + xz = 0 \\
C_{23} = C_{32} &= 2yz - yz - yz = 0
\end{aligned}$$

$$A'A = \begin{bmatrix} 2x^2 & 0 & 0 \\ 0 & 6y^2 & 0 \\ 0 & 0 & 3z^2 \end{bmatrix}$$ -----------**[4 अंक]**

$\because A'A = I$

$$\begin{bmatrix} 2x^2 & 0 & 0 \\ 0 & 6y^2 & 0 \\ 0 & 0 & 3z^2 \end{bmatrix} = \begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{bmatrix}$$

दोनों आव्यूहों के अवयवों की तुलना करने पर,

$$\begin{aligned}
2x^2 &= 1 \Rightarrow x^2 = \frac{1}{2} \Rightarrow x = \pm\frac{1}{\sqrt{2}} \\
6y^2 &= 1 \Rightarrow y^2 = \frac{1}{6} \Rightarrow y = \pm\frac{1}{\sqrt{6}} \\
3z^2 &= 1 \Rightarrow z^2 = \frac{1}{3} \Rightarrow z = \pm\frac{1}{\sqrt{3}}
\end{aligned}$$

$$\therefore\; \boxed{x = \pm\frac{1}{\sqrt{2}},\ y = \pm\frac{1}{\sqrt{6}},\ z = \pm\frac{1}{\sqrt{3}}}$$ -----------**[4 अंक]**

🧮 **calculation सँभालो, ग़लती यहीं होती है** — $A'A$ में विकर्ण के बाहर वाले सारे अवयव शून्य निकलते हैं, इसलिए तीन ही समीकरण बचते हैं।

**प्र. 86**  `[8 अंक · 2025 · 2024 · 2023 · दीर्घ उत्तरीय प्रश्न]`  *यही सवाल 5 अंक पर प्र. 65 में*


**सिद्ध कीजिए कि आव्यूह $A = \left[\begin{array}{cc} 3 & 1 \\ -1 & 2 \end{array}\right]$ समीकरण $A^2 - 5A + 7I = O$ को सन्तुष्ट करता है, जहाँ $I, 2 \times 2$ कोटि का तत्समक् आव्यूह है और $O, 2 \times 2$ कोटि का शून्य आव्यूह है। अतः इसकी सहायता से $A^{-1}$ ज्ञात कीजिए।**

**उत्तर:** दिया है, $A = \begin{bmatrix} 3 & 1 \\ -1 & 2 \end{bmatrix}$

$$\begin{aligned}
A^2 = A \times A &= \begin{bmatrix} 3 & 1 \\ -1 & 2 \end{bmatrix}\begin{bmatrix} 3 & 1 \\ -1 & 2 \end{bmatrix} \\
&= \begin{bmatrix} 9-1 & 3+2 \\ -3-2 & -1+4 \end{bmatrix} = \begin{bmatrix} 8 & 5 \\ -5 & 3 \end{bmatrix}
\end{aligned}$$
$$\begin{aligned}
\text{बायाँ पक्ष} = A^2 - 5A + 7I &= \begin{bmatrix} 8 & 5 \\ -5 & 3 \end{bmatrix} - 5\begin{bmatrix} 3 & 1 \\ -1 & 2 \end{bmatrix} + 7\begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} \\
&= \begin{bmatrix} 8-15+7 & 5-5+0 \\ -5+5+0 & 3-10+7 \end{bmatrix} \\
&= \begin{bmatrix} 0 & 0 \\ 0 & 0 \end{bmatrix} = O = \text{दायाँ पक्ष}
\end{aligned}$$ -----------**[3 अंक]**

अब, $A^2 - 5A + 7I = O$; $A^{-1}$ से गुणा करने पर,

$$\begin{aligned}
A - 5I + 7A^{-1} &= O && [\because AA^{-1} = I] \\
\begin{bmatrix} 3 & 1 \\ -1 & 2 \end{bmatrix} - 5\begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} + 7A^{-1} &= O \\
7A^{-1} &= \begin{bmatrix} 5 & 0 \\ 0 & 5 \end{bmatrix} - \begin{bmatrix} 3 & 1 \\ -1 & 2 \end{bmatrix} \\
7A^{-1} &= \begin{bmatrix} 5-3 & 0-1 \\ 0+1 & 5-2 \end{bmatrix}
\end{aligned}$$

$$\therefore\; \boxed{A^{-1} = \frac{1}{7}\begin{bmatrix} 2 & -1 \\ 1 & 3 \end{bmatrix}}$$ -----------**[3 अंक]**

जाँच: व्युत्क्रम की परिभाषा से $A A^{-1} = I$ आना चाहिए,

$$A A^{-1} = \frac{1}{7}\begin{bmatrix} 3 & 1 \\ -1 & 2 \end{bmatrix}\begin{bmatrix} 2 & -1 \\ 1 & 3 \end{bmatrix} = \frac{1}{7}\begin{bmatrix} 6+1 & -3+3 \\ -2+2 & 1+6 \end{bmatrix} = \frac{1}{7}\begin{bmatrix} 7 & 0 \\ 0 & 7 \end{bmatrix} = I$$ -----------**[2 अंक]**

#### पुस्तक से

**प्र. 87**  `[8 अंक · दीर्घ उत्तरीय प्रश्न]`  *यही सवाल 4 अंक पर प्र. 79 में*


**सिद्ध कीजिए कि आव्यूह $A = \left[\begin{array}{ll} 2 & 3 \\ 1 & 2 \end{array}\right]$ समीकरण $A^2 - 4A + I_2 = O$ को सन्तुष्ट करता है, जहाँ $I_2$ एक $2 \times 2$ तत्समक् आव्यूह तथा $O$ एक $2 \times 2$ शून्य आव्यूह हैं। इसकी सहायता से $A^{-1}$ ज्ञात कीजिए। [योग्यता आधारित प्रश्न (CBQ)]**

**उत्तर:** दिया है, $A = \begin{bmatrix} 2 & 3 \\ 1 & 2 \end{bmatrix}$

$$\begin{aligned}
A^2 = A \cdot A &= \begin{bmatrix} 2 & 3 \\ 1 & 2 \end{bmatrix}\begin{bmatrix} 2 & 3 \\ 1 & 2 \end{bmatrix} \\
&= \begin{bmatrix} 4+3 & 6+6 \\ 2+2 & 3+4 \end{bmatrix} = \begin{bmatrix} 7 & 12 \\ 4 & 7 \end{bmatrix}
\end{aligned}$$ -----------**[1 अंक]**
$$\begin{aligned}
\text{बायाँ पक्ष} = A^2 - 4A + I_2 &= \begin{bmatrix} 7 & 12 \\ 4 & 7 \end{bmatrix} - 4\begin{bmatrix} 2 & 3 \\ 1 & 2 \end{bmatrix} + \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} \\
&= \begin{bmatrix} 7 & 12 \\ 4 & 7 \end{bmatrix} + \begin{bmatrix} -8 & -12 \\ -4 & -8 \end{bmatrix} + \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} \\
&= \begin{bmatrix} 7-8+1 & 12-12+0 \\ 4-4+0 & 7-8+1 \end{bmatrix} = \begin{bmatrix} 0 & 0 \\ 0 & 0 \end{bmatrix} = O = \text{दायाँ पक्ष}
\end{aligned}$$ -----------**[3 अंक]**

$\because A^2 - 4A + I_2 = O$, $A^{-1}$ से दोनों पक्षों में गुणा करने पर,

$$\begin{aligned}
A - 4AA^{-1} + A^{-1} &= O \\
A - 4I_2 + A^{-1} &= O \\
A^{-1} &= 4I_2 - A \\
&= 4\begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} - \begin{bmatrix} 2 & 3 \\ 1 & 2 \end{bmatrix} \\
&= \begin{bmatrix} 4 & 0 \\ 0 & 4 \end{bmatrix} - \begin{bmatrix} 2 & 3 \\ 1 & 2 \end{bmatrix} = \begin{bmatrix} 4-2 & 0-3 \\ 0-1 & 4-2 \end{bmatrix}
\end{aligned}$$

$$\therefore\; \boxed{A^{-1} = \begin{bmatrix} 2 & -3 \\ -1 & 2 \end{bmatrix}}$$ -----------**[3 अंक]**

जाँच: व्युत्क्रम की परिभाषा से $A A^{-1} = I_2$ आना चाहिए,

$$A A^{-1} = \begin{bmatrix} 2 & 3 \\ 1 & 2 \end{bmatrix}\begin{bmatrix} 2 & -3 \\ -1 & 2 \end{bmatrix} = \begin{bmatrix} 4-3 & -6+6 \\ 2-2 & -3+4 \end{bmatrix} = \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} = I_2$$ -----------**[1 अंक]**

---

### अध्याय-परीक्षा · ख़ुद पर आज़माओ

इस अध्याय से एक पेपर में औसतन **8 अंक** आते हैं, इसलिए नीचे की हर परीक्षा भी 8 अंक की है। उत्तर ढककर हल करो, फिर उसी `प्र.` पर जाकर मिलाओ। हर परीक्षा के लिए **30 मिनट** रखो।

| परीक्षा | 1 अंक | 2 अंक | 5 अंक | क्या जाँच रही है |
|---|---|---|---|---|
| **क** | `प्र. 1` | `प्र. 35` | `प्र. 63` | कोटि · आव्यूह-बहुपद · सबसे ज़्यादा पूछी गई उपपत्ति |
| **ख** | `प्र. 7` | `प्र. 38` | `प्र. 65` | गुणनफल का व्युत्क्रम · लम्बकोणीय · सर्वसमिका से $A^{-1}$ |
| **ग** | `प्र. 2` | `प्र. 36` | `प्र. 67` | अदिश का परिवर्त · $A'$ दिए होने पर $(A+2B)'$ · अज्ञात आव्यूह $X$, $Y$ |
| **घ** | `प्र. 12` | `प्र. 55` | `प्र. 72` | $(AB)'=B'A'$ · उसका सत्यापन · सममित-विषम बँटवारा |

आठ अंक एक ही सवाल में भी आ सकते हैं। ऐसे तीन पूरे पेपर-सवाल ये हैं, और तीनों 30 मिनट में अकेले लिखने का अभ्यास माँगते हैं:

| परीक्षा | 8 अंक | किस पेपर से |
|---|---|---|
| **ङ** | `प्र. 76` | 2026, गुणन-समीकरण से $D$ |
| **च** | `प्र. 80` | 2023, प्रारम्भिक संक्रियाओं से व्युत्क्रम |
| **छ** | `प्र. 77` | 2025, $F(x)F(y) = F(x+y)$ |

> बिना हल वाले अलग अभ्यास-प्रश्न इस अध्याय में नहीं दिए गए, और इसकी वजह अच्छी है: 2020 तथा 2022 से 2026 तक के तेईस पेपरों में इस अध्याय से जो भी आया, उसका हल **इसी किताब में** है। इसलिए अभ्यास के लिए ऊपर की परीक्षाएँ और भाग 2 के बचे सवाल ही काफ़ी हैं; उत्तर ढककर हल करो, वही असली अभ्यास है।
