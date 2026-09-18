# अध्याय 3 : आव्यूह (Matrices)

> इस अध्याय से एक पेपर में औसतन **7 अंक** आते हैं। 22 असली पेपर सेट गिने गए (2020, 2022–2026)।

---

## 🎯 वो अंक किन प्रश्न-प्रकारों से आते हैं?

| प्रश्न-प्रकार | कितने प्रश्न | एक पेपर में लगभग |
|---|---|---|
| आव्यूह की घात व आव्यूह-बहुपद | 11 | 1.8 |
| त्रिकोणमितीय आव्यूह-सर्वसमिका | 8 | 1.3 |
| आव्यूह गुणन व क्रम-विनिमेयता | 6 | 1.0 |
| कोटि, प्रकार व अवयवों से रचना | 4 | 0.7 |
| परिवर्त और (AB)′ = B′A′ | 4 | 0.7 |
| व्युत्क्रम और (AB)⁻¹ = B⁻¹A⁻¹ | 4 | 0.7 |

**कुल 56 प्रश्न $\cdot$ 175 अंक $\cdot$ छह पेपरों में औसतन 29 अंक प्रति पेपर।**

## 📅 किस वर्ष कितने

| वर्ष | प्रश्न |
|---|---|
| 2026 | 7 |
| 2025 | 10 |
| 2024 | 6 |
| 2023 | 12 |
| 2022 | 10 |
| 2020 | 7 |
| 2019 | 1 |
| 2018 | 4 |
| 2016 | 2 |
| 2014 | 2 |

## 🟢 जो कभी नहीं पूछा गया

शाब्दिक प्रश्न (अनुप्रयोग), इन 22 सेटों में एक बार भी नहीं। सबसे कम पूछे गए: योग-अंतर और सममित-अपघटन, एक-एक बार।

---

# भाग 1 : त्वरित रिवीज़न

> इस अध्याय से एक पेपर में औसतन **7 अंक** आते हैं। 22 असली पेपर सेट गिने गए (2020, 2022–2026)।

## 🔁 जो लौटकर आते हैं : यही पहले करो

| प्रश्न-प्रकार | कितने पेपरों में | अंक |
|---|---|---|
| आव्यूह की घात व आव्यूह-बहुपद | **11** | 5 · 4 · 2 · 8 |
| त्रिकोणमितीय आव्यूह-सर्वसमिका | **8** | 1 · 5 · 2 · 8 |
| आव्यूह गुणन व क्रम-विनिमेयता | **6** | 2 · 1 · 5 · 8 |
| कोटि, प्रकार व रचना · परिवर्त · व्युत्क्रम | **4** each | 1 · 2 · 5 |

---

## 3.7 आव्यूह की घात व आव्यूह-बहुपद ☞ *बार-बार* $\cdot$ **[11 बार $\cdot$ 5, 4, 2, 8 अंक]**

**विधि:** पहले $A^{2}$ परिकलित करो; प्राय: $A^{2} = m\cdot A$ जैसा प्रतिरूप मिलता है, जिससे
$A^{3} = m^{2}A$। फिर $A^{3} - 23A - 40I$ जैसे व्यंजक में रखकर संगत अवयव जोड़ो।
**सीमा:** $A^{n} = k^{n-1}A$ केवल अदिश आव्यूह ($A = kI$) पर लागू है।
⚠️ किसी भी वर्ग आव्यूह पर यह सूत्र मान लेना गलत है; $A^{2}$ निकाले बिना कोई घात मत लिखो।

## 3.6 त्रिकोणमितीय आव्यूह-सर्वसमिका ☞ *बार-बार* $\cdot$ **[8 बार $\cdot$ 1, 5, 2, 8 अंक]**

**विधि (स्वयं लिखित):** $F(x)\cdot F(y)$ का गुणन खोलो; हर अवयव में
$\cos x \cos y - \sin x \sin y = \cos(x+y)$ और $\sin x \cos y + \cos x \sin y = \sin(x+y)$ लगाओ।
$A^{n}$ के लिए $A^{2}$, $A^{3}$ निकालकर कोण का प्रतिरूप ($\theta \to n\theta$) पहचानो।
**सीमा:** केवल घूर्णन-रूप के आव्यूहों पर।
⚠️ $\sin^{2}\theta + \cos^{2}\theta = 1$ विकर्ण पर ही बनता है; अविकर्ण अवयव प्राय: कटते हैं।

## 3.5 आव्यूह गुणन व क्रम-विनिमेयता ☞ *बार-बार* $\cdot$ **[6 बार $\cdot$ 2, 1, 5, 8 अंक]**

**विधि:** $AB$ का अवयव $c_{ik} = \Sigma\, a_{ij}\cdot b_{jk}$; A की i-वीं पंक्ति के अवयवों को
B के k-वें स्तम्भ के संगत अवयवों से गुणा करके जोड़ो।
**सीमा:** $AB$ तभी परिभाषित जब A के स्तम्भ = B की पंक्तियाँ।
⚠️ $AB = O$ होने पर भी $BA \ne O$ हो सकता है; क्रम बदलकर हल करना गलत निकाय देता है।

## 3.1 कोटि, प्रकार व अवयवों से रचना ☞ *बार-बार* $\cdot$ **[4 बार $\cdot$ 1 अंक]**

**विधि:** कोटि = (पंक्तियाँ) × (स्तम्भ) = $m \times n$; कुल अवयव = $mn$; $a_{ij}$ = i-वीं पंक्ति,
j-वें स्तम्भ का अवयव। अवयव-सूत्र दिया हो तो i, j रखकर पूरा आव्यूह भरो।
⚠️ $a_{ij}$ में पहला सूचकांक सदैव पंक्ति, दूसरा स्तम्भ; $a_{24}$ को उलटकर मत पढ़ो।

## 3.8 परिवर्त और $(AB)' = B'A'$ ☞ *बार-बार* $\cdot$ **[4 बार $\cdot$ 1, 2 अंक]**

**विधि:** $A = [a_{ij}]$ का परिवर्त $A' = [a_{ji}]$; पंक्तियों को स्तम्भ बना दो।
**सूत्र:** $(A')' = A$ $\cdot$ $(A+B)' = A'+B'$ $\cdot$ $(kA)' = kA'$ $\cdot$ $(AB)' = B'A'$ (क्रम पलटता है)।
⚠️ परिवर्त में केवल स्थान बदलते हैं, चिह्न या मान नहीं; करणी-अवयव ज्यों-के-त्यों रहते हैं।

## 3.10 व्युत्क्रम और $(AB)^{-1} = B^{-1}A^{-1}$ ☞ *बार-बार* $\cdot$ **[4 बार $\cdot$ 5, 2, 1 अंक]**

**विधि:** $B = A^{-1}$ तभी जब $AB = BA = I$। उपपत्ति में
$(AB)(B^{-1}A^{-1}) = A(BB^{-1})A^{-1} = AA^{-1} = I$; साहचर्य नियम से कोष्ठक बदलो, फिर
एक-एक पद काटो।
⚠️ पुष्टि के लिए $AB = I$ **और** $BA = I$ दोनों दिखाना ज़रूरी है; एक ओर का गुणनफल अधूरा है।

## 3.4 आव्यूह-समीकरण से अज्ञात आव्यूह $\cdot$ **[3 बार $\cdot$ 5, 1 अंक]**

**विधि:** X को अकेला करो, $2A + 3X = 5B \Rightarrow X = \tfrac{1}{3}(5B - 2A)$। $X+Y$ और
$X-Y$ दिए हों तो जोड़कर $2X$, घटाकर $2Y$ निकालो।
⚠️ $\tfrac{1}{2}$ से गुणा करना मत भूलो; $2X$ को ही X लिख देना सबसे आम भूल है।

## 3.11 प्रारम्भिक संक्रियाओं से व्युत्क्रम $\cdot$ **[3 बार $\cdot$ 4, 8 अंक]**

**विधि (स्वयं लिखित; पुस्तक यह विधि नहीं सिखाती):** $A = IA$ लिखो; बायें पक्ष पर पंक्ति-संक्रियाएँ
लगाकर A को I बनाओ, वही संक्रियाएँ दायें पक्ष के I पर लगाओ। बायाँ I बनते ही दायाँ $A^{-1}$ है।
⚠️ **इसे छोड़ना सबसे महँगा पड़ेगा**, क्योंकि बोर्ड ने इसे तीन बार पूछा है, 8 अंक तक।

## 3.2 समानता से अज्ञात (x, y, z) $\cdot$ **[2 बार $\cdot$ 1 अंक]**

**विधि:** दो आव्यूह समान तभी जब कोटि समान और हर संगत अवयव समान; अवयव बराबर रखकर समीकरण बनाओ।
⚠️ गुणनफल-प्रकार अवयव (जैसे $xy = 8$) आए तो दोनों सम्भव हल-युग्म लिखो।

## 3.3 योग $\cdot$ अंतर $\cdot$ अदिश-गुणन $\cdot$ **[1 बार $\cdot$ 2 अंक]**

$A + B = [a_{ij} + b_{ij}]$ (समान कोटि पर ही) $\cdot$ $kA = [k\,a_{ij}]$।
⚠️ करणी-अवयव ($\sqrt{3}$) दशमलव में मत बदलो।

## 3.9 सममित व विषम सममित, और अपघटन $\cdot$ **[1 बार $\cdot$ 5 अंक]**

$A' = A$ → सममित $\cdot$ $A' = -A$ → विषम सममित (विकर्ण शून्य) $\cdot$ हर वर्ग आव्यूह
$A = \tfrac{1}{2}(A+A') + \tfrac{1}{2}(A-A')$।
⚠️ प्रकार बताने से पहले $A'$ पूरा निकालो; केवल विकर्ण देखकर तय मत करो।

## 3.12 शाब्दिक प्रश्न (अनुप्रयोग) $\cdot$ **[इन 22 पेपरों में एक बार भी नहीं]**

संख्या-आव्यूह $\times$ लागत-आव्यूह इस क्रम में कि परिणाम कुल-व्यय-स्तम्भ बने।

---

## 🧭 उपपत्ति के चरण : तीनों उपपत्तियाँ एक ही ढाँचे पर चलती हैं

बोर्ड जो उपपत्तियाँ माँगता है, उन सबका ढाँचा एक है:

**1.** जो सिद्ध करना है, उसका बायाँ पक्ष लिखो। **2.** परिभाषा या गुणधर्म एक बार लगाओ।
**3.** साहचर्य नियम से कोष्ठक बदलो। **4.** $AA^{-1} = I$ या $(A')' = A$ से एक पद काटो।
**5.** दायाँ पक्ष मिला, तो `इति सिद्धम्` लिखो।

**52 में से 18 प्रश्न** इसी क्रिया के हैं (`सिद्ध कीजिए` $\cdot$ `दर्शाइए` $\cdot$ `सत्यापित कीजिए`)।

## 🔀 एक ही सवाल, तीन क़ीमतें : पहचान लो

वही प्रश्न अलग वर्षों में अलग अंकों पर आता है; **5 ऐसे मिले।** अंक बदलते ही अपेक्षा
बदलती है, गणित नहीं:

| प्रश्न | अंक | तब क्या माँगा जाता है |
|---|---|---|
| $A^{3}$, घूर्णन-आव्यूह | 2 · 5 | 2 पर परिणाम, 5 पर पूरे चरण |
| $F(x)F(y) = F(x+y)$ | 2 · 8 | 8 पर हर अवयव का सरलीकरण भी |
| $(AB)^{-1} = B^{-1}A^{-1}$ | 2 · 5 | 5 पर परिभाषा से शुरू |
| $CD - AB = O$ से D | 5 · 8 | 8 पर चारों समीकरण हल करके |

**अंक देखकर लम्बाई तय करो**, विधि नहीं।

---

### 🟢 आधार पट्टी

**कभी नहीं पूछा गया:** शाब्दिक प्रश्न (3.12)। **सबसे कम:** योग-अंतर (3.3) और सममित-अपघटन (3.9),
एक-एक बार, पर 3.9 पाँच अंक पर आया, इसलिए छोड़ने लायक नहीं।

---

# भाग 2 : प्रश्न एवं उत्तर (पूर्ण)

> **इसे कैसे पढ़ें:** सबसे नया पेपर सबसे ऊपर है। 2026 का पेपर हल करके देखो; जो आए, वही
> अगले वर्षों में लौटता है।

> **★★** = दो पेपरों में $\cdot$ **★★★** = तीन या अधिक पेपरों में।

*(वर्ष-खिड़की: 2019–2026। इससे पुराने वर्ष `महत्वपूर्ण प्रश्न` में हैं।)*

---

## 2026

**प्र. 1**  `[2026 · 1 अंक]`

(घ) $A=[a_{ij}]_{m\times n}$ एक वर्ग आव्यूह है, यदि
(A) $m<n$  (B) $m>n$  (C) $m=n$  (D) इनमें से कोई नहीं

**उत्तर:** 2 $\times$ 2 कोटि का रिक्त आव्यूह सममित तथा विषम सममित दोनों आव्यूह होता है।

सममित आव्यूह के लिए,  $a_{ij}$ = **$a_{ji}$**  ...(i)
विषम सममित आव्यूह के लिए,  $a_{ij}$ = **$-$ $a_{ji}$**  ...(ii)
समी. (i) व (ii) से,  $a_{ij}$ = **0**.

---

**प्र. 2**  `[2026 · 1 अंक]`

🧮 **Calculation me galti:** परिवर्त में केवल स्थान बदलते हैं, चिह्न या मान नहीं; करणी-अवयव ज्यों-के-त्यों रहते हैं।

(ग) यदि $A$ कोई आव्यूह है और $K$ कोई अचर है, तो $(KA)'$ होगा :
(A) $K'A'$
(B) $A'K'$
(C) $KA'$
(D) $KA$

**उत्तर:** (C) $KA'$

परिवर्त लेने पर अदिश बाहर ही रहता है: $(KA)' = K A'$। अदिश का अपना कोई परिवर्त नहीं होता।

---

**प्र. 3**  `[2026 · 2 अंक]`

यदि $A=\begin{bmatrix}1&2&3\\2&3&1\end{bmatrix}$ तथा $B=\begin{bmatrix}3&-1&3\\-1&0&2\end{bmatrix}$ हैं, तो $(2A-B)$ का मान ज्ञात कीजिए।

**उत्तर:** दिया है, $A = \begin{bmatrix} 1 & 2 & 3 \\ 2 & 3 & 1 \end{bmatrix}$ तथा $B = \begin{bmatrix} 3 & -1 & 3 \\ -1 & 0 & 2 \end{bmatrix}$
अब, $2A = \begin{bmatrix} 2 & 4 & 6 \\ 4 & 6 & 2 \end{bmatrix}$ -----------**[½ अंक]**
$\therefore 2A - B = \begin{bmatrix} 2 & 4 & 6 \\ 4 & 6 & 2 \end{bmatrix} - \begin{bmatrix} 3 & -1 & 3 \\ -1 & 0 & 2 \end{bmatrix}$
$= \begin{bmatrix} 2 - 3 & 4 + 1 & 6 - 3 \\ 4 + 1 & 6 - 0 & 2 - 2 \end{bmatrix} = \begin{bmatrix} -1 & 5 & 3 \\ 5 & 6 & 0 \end{bmatrix}$ -----------**[½ अंक]**

---

**प्र. 4**  `[2026 · 2 अंक]`

यदि $A^{2}=A$ हो, तो $(I+A)^{2}-7A$ को सरल कीजिए, जहाँ $A$ एक वर्ग आव्यूह है।

**उत्तर:** दिया है, $A^{2} = A$

$(I+A)^{2} - 7A = I^{2} + IA + AI + A^{2} - 7A$

$= I + 2A + A^{2} - 7A$

$= I + 2A + A - 7A$  $[\because A^{2} = A]$

$= I - 4A$

---

**प्र. 5**  `[2026 · 5 अंक]`

⚠ **Board ka jaal:** $-2I$ में 2 केवल विकर्ण पर आता है, हर अवयव पर नहीं; इसे अनदेखा करना पूरे उत्तर को बिगाड़ देता है।

यदि $A=\begin{bmatrix}3 & -2 \\ 4 & -2\end{bmatrix}$ तथा $I=\begin{bmatrix}1 & 0 \\ 0 & 1\end{bmatrix}$ एवं $A^{2}=kI-2I$, तो $k$ का मान ज्ञात कीजिए।

**उत्तर:** दिया है, $A^2 = kA - 2I$
$\Rightarrow A \cdot A = kA - 2I$
$\Rightarrow \begin{bmatrix} 3 & -2 \\ 4 & -2 \end{bmatrix}\begin{bmatrix} 3 & -2 \\ 4 & -2 \end{bmatrix} = k\begin{bmatrix} 3 & -2 \\ 4 & -2 \end{bmatrix} - 2\begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix}$
$\Rightarrow \begin{bmatrix} 9 - 8 & -6 + 4 \\ 12 - 8 & -8 + 4 \end{bmatrix} = \begin{bmatrix} 3k & -2k \\ 4k & -2k \end{bmatrix} - \begin{bmatrix} 2 & 0 \\ 0 & 2 \end{bmatrix}$
$\Rightarrow \begin{bmatrix} 1 & -2 \\ 4 & -4 \end{bmatrix} = \begin{bmatrix} 3k - 2 & -2k \\ 4k & -2k - 2 \end{bmatrix}$ -----------**[½ अंक]**
समान आव्यूह के गुणधर्म द्वारा समान आव्यूह के संगत अवयवों को समान रखने पर,
$3k - 2 = 1 \Rightarrow k = 1$
इसी प्रकार, अन्य अवयवों की तुलना करने पर, $k = 1$ -----------**[½ अंक]**

---

**प्र. 6**  `[2026 · 5 अंक]`

**उत्तर:** (i) दिया है,  A = [ 3  $\sqrt{3}$  2 ; 4  2  0 ]  $\Rightarrow$  $A '$ = [ 3  4 ; $\sqrt{3}$  2 ; 2  0 ]

$\therefore$  ($A '$)$'$ = [ 3  $\sqrt{3}$  2 ; 4  2  0 ] = A.  इति सिद्धम्

(ii) दिया है,  A = [ 3  $\sqrt{3}$  2 ; 4  2  0 ]  तथा B = [ 2  $- 1$  2 ; 1  2  4 ]

⇒  बायाँ पक्ष = (A + B)′ = [ 5  $\sqrt{3} - 1$  4 ; 5  4  4 ]′ = [ 5  5 ; $\sqrt{3} - 1$  4 ; 4  4 ]

$\Rightarrow$  दायाँ पक्ष = $A '$ + $B '$ = [ 3  4 ; $\sqrt{3}$  2 ; 2  0 ] + [ 2  1 ; $- 1$  2 ; 2  4 ] = [ 5  5 ; $\sqrt{3} - 1$  4 ; 4  4 ]

अतः,  बायाँ पक्ष = दायाँ पक्ष  इति सिद्धम्

---

**प्र. 7**  `[2026 · 8 अंक]`

मान लीजिए कि $A=\begin{bmatrix}2 & -1 \\ 3 & 4\end{bmatrix},\ B=\begin{bmatrix}5 & 2 \\ 7 & 4\end{bmatrix},\ C=\begin{bmatrix}2 & 5 \\ 3 & 8\end{bmatrix}$ हैं। एक आव्यूह $D$ ज्ञात कीजिए कि $CD-AB=O$ हो।

**उत्तर:** क्योंकि A, B, C सभी कोटि 2 के वर्ग आव्यूह हैं और CD $-$ AB भली-भाँति
परिभाषित है, इसलिए D कोटि 2 का एक वर्ग आव्यूह होना चाहिए।

मान लीजिए कि, D = $\begin{bmatrix}a & b \\ c & d\end{bmatrix}$ है। तब CD − AB = O से प्राप्त होता है

    $\begin{bmatrix}2 & 5 \\ 3 & 8\end{bmatrix}$ $\begin{bmatrix}a & b \\ c & d\end{bmatrix}$ − $\begin{bmatrix}2 & -1 \\ 3 & 4\end{bmatrix}$ $\begin{bmatrix}5 & 2 \\ 7 & 4\end{bmatrix}$ = O

या  $\begin{bmatrix}2a + 5c & 2b + 5d \\ 3a + 8c & 3b + 8d\end{bmatrix}$  −  $\begin{bmatrix}3 & 0 \\ 43 & 22\end{bmatrix}$  =  $\begin{bmatrix}0 & 0 \\ 0 & 0\end{bmatrix}$

या  $\begin{bmatrix}2a + 5c - 3 & 2b + 5d \\ 3a + 8c - 43 & 3b + 8d - 22\end{bmatrix}$  =  $\begin{bmatrix}0 & 0 \\ 0 & 0\end{bmatrix}$

आव्यूह की समानता से हमें निम्नलिखित समीकरण प्राप्त होते हैं:

2a + 5c $-$ 3 = 0  ...(i)
3a + 8c $-$ 43 = 0  ...(ii)
2b + 5d = 0  ...(iii)
तथा  3b + 8d $-$ 22 = 0  ...(iv)

(i) तथा (ii) को विलोपन विधि द्वारा सरल करने पर **a = $-$ 191, c = 77** प्राप्त होता है।
(iii) तथा (iv) को विलोपन विधि द्वारा सरल करने पर **b = $-$ 110, d = 44** प्राप्त होता है।

अतः  D = $\begin{bmatrix}a & b \\ c & d\end{bmatrix}$  =  [ $-$ 191  $-$ 110 ; 77  44 ]  उत्तर

---

## 2025

**प्र. 8**  `[2022 · 2025 · 1 अंक]`  ★★

(ख) यदि आव्यूह $A$ और $B$ के क्रम (कोटि) क्रमशः: $m\times n$ और $n\times p$ हैं, तो $AB$ का क्रम है :
(i) $p\times m$  (ii) $n\times m$  (iii) $m\times p$  (iv) इनमें से कोई नहीं

**उत्तर:** (c) दिया है, आव्यूह $A$ का क्रम $= m \times n$; आव्यूह $B$ का क्रम $= n \times p$
$\therefore$ $AB$ का क्रम $= m \times p$

---

**प्र. 9**  `[2025 · 1 अंक]`

🧮 **Calculation me galti:** $2X$ से $X$ पाने के लिए $\tfrac{1}{2}$ से गुणा करना न भूलिए।

(ङ) यदि $2X+Y=\begin{bmatrix}1&0\\-3&2\end{bmatrix}$ तथा $Y=\begin{bmatrix}3&2\\1&4\end{bmatrix}$, तो $X$ होगा
(i) $\begin{bmatrix}-1&-1\\-2&-2\end{bmatrix}$
(ii) $\begin{bmatrix}-1&-1\\-2&-1\end{bmatrix}$
(iii) $\begin{bmatrix}-2&-1\\-1&-1\end{bmatrix}$
(iv) $\begin{bmatrix}-1&-2\\-1&-1\end{bmatrix}$

**उत्तर:** $2X + Y = \begin{bmatrix} 1 & 0 \\ -3 & 2 \end{bmatrix}$ तथा $Y = \begin{bmatrix} 3 & 2 \\ 1 & 4 \end{bmatrix}$
$\therefore 2X + \begin{bmatrix} 3 & 2 \\ 1 & 4 \end{bmatrix} = \begin{bmatrix} 1 & 0 \\ -3 & 2 \end{bmatrix}$ [$Y$ का मान रखने पर] -----------**[½ अंक]**
$\Rightarrow 2X = \begin{bmatrix} 1 & 0 \\ -3 & 2 \end{bmatrix} - \begin{bmatrix} 3 & 2 \\ 1 & 4 \end{bmatrix}$
$\Rightarrow 2X = \begin{bmatrix} -2 & -2 \\ -4 & -2 \end{bmatrix} \Rightarrow X = \begin{bmatrix} -1 & -1 \\ -2 & -1 \end{bmatrix}$ -----------**[½ अंक]**

---

**प्र. 10**  `[2025 · 2 अंक]`

🧮 **Calculation me galti:** परिवर्त में केवल स्थान बदलते हैं, चिह्न या मान नहीं; करणी-अवयव ज्यों-के-त्यों रहते हैं।

यदि $A'=\begin{bmatrix}-2 & 3 \\ 1 & 2\end{bmatrix}$ तथा $B=\begin{bmatrix}-1 & 0 \\ 1 & 2\end{bmatrix}$, तो $(A+2B)'$ ज्ञात कीजिए।

**उत्तर:** दिया है, $A' = \begin{bmatrix} -2 & 3 \\ 1 & 2 \end{bmatrix}$
$\Rightarrow A = (A')' = \begin{bmatrix} -2 & 3 \\ 1 & 2 \end{bmatrix}' = \begin{bmatrix} -2 & 1 \\ 3 & 2 \end{bmatrix}$ $[\because (A')' = A]$
तथा $2B = 2\begin{bmatrix} -1 & 0 \\ 1 & 2 \end{bmatrix} = \begin{bmatrix} -2 & 0 \\ 2 & 4 \end{bmatrix}$ -----------**[1 अंक]**
$\therefore A + 2B = \begin{bmatrix} -2 & 1 \\ 3 & 2 \end{bmatrix} + \begin{bmatrix} -2 & 0 \\ 2 & 4 \end{bmatrix} = \begin{bmatrix} -4 & 1 \\ 5 & 6 \end{bmatrix}$
$\Rightarrow (A + 2B)' = \begin{bmatrix} -4 & 1 \\ 5 & 6 \end{bmatrix}' = \begin{bmatrix} -4 & 5 \\ 1 & 6 \end{bmatrix}$ -----------**[1 अंक]**

---

**प्र. 11**  `[2025 · 2 अंक]`

🧮 **Calculation me galti:** परिवर्त में केवल स्थान बदलते हैं, चिह्न या मान नहीं; करणी-अवयव ज्यों-के-त्यों रहते हैं।

यदि $A=\begin{bmatrix}\cos \alpha & \sin \alpha \\ -\sin \alpha & \cos \alpha\end{bmatrix}$, तो सत्यापित कीजिए कि $A'A=I$।

**उत्तर:** $A = \begin{bmatrix} \cos\alpha & \sin\alpha \\ -\sin\alpha & \cos\alpha \end{bmatrix}$
$\therefore A' = \begin{bmatrix} \cos\alpha & -\sin\alpha \\ \sin\alpha & \cos\alpha \end{bmatrix}$
बायाँ पक्ष $= A'A$
$= \begin{bmatrix} \cos\alpha & -\sin\alpha \\ \sin\alpha & \cos\alpha \end{bmatrix}\begin{bmatrix} \cos\alpha & \sin\alpha \\ -\sin\alpha & \cos\alpha \end{bmatrix}$
$= \begin{bmatrix} \cos^2\alpha + \sin^2\alpha & \cos\alpha \sin\alpha - \cos\alpha \sin\alpha \\ \sin\alpha \cos\alpha - \cos\alpha \sin\alpha & \sin^2\alpha + \cos^2\alpha \end{bmatrix}$
$= \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} = I =$ दायाँ पक्ष **इति सिद्धम्** -----------**[2 अंक]**

---

**प्र. 12**  `[2025 · 2 अंक]`

🧮 **Calculation me galti:** परिवर्त में केवल स्थान बदलते हैं, चिह्न या मान नहीं; करणी-अवयव ज्यों-के-त्यों रहते हैं।
🧮 **Calculation me galti:** आधे वाले गुणांक को अंत तक साथ ले चलिए; उसे छोड़ देने पर उत्तर दुगना आ जाता है।

यदि $A=\begin{bmatrix}3&\sqrt{3}&2\\4&2&0\end{bmatrix}$ तथा $B=\begin{bmatrix}0&\frac{1}{4}\\0&0\\\frac{1}{2}&\frac{1}{8}\end{bmatrix}$, तब सिद्ध कीजिए कि $(A')'\cdot B=\begin{bmatrix}1&1\\0&1\end{bmatrix}$।

**उत्तर:** दिया गया है, $A = \begin{bmatrix} 3 & \sqrt{3} & 2 \\ 4 & 2 & 0 \end{bmatrix}$ तथा $B = \begin{bmatrix} 0 & 1/4 \\ 0 & 0 \\ 1/2 & 1/8 \end{bmatrix}$
हम जानते हैं, $(A')' = A$
$\therefore$ बायाँ पक्ष $= (A')' \cdot B = AB = \begin{bmatrix} 3 & \sqrt{3} & 2 \\ 4 & 2 & 0 \end{bmatrix}\begin{bmatrix} 0 & 1/4 \\ 0 & 0 \\ 1/2 & 1/8 \end{bmatrix}$ -----------**[1 अंक]**
$= \begin{bmatrix} 0 + 0 + 1 & 3/4 + 0 + 1/4 \\ 0 + 0 + 0 & 1 + 0 + 0 \end{bmatrix}$
$= \begin{bmatrix} 1 & 1 \\ 0 & 1 \end{bmatrix} =$ दायाँ पक्ष -----------**[1 अंक]**

---

**प्र. 13**  `[2025 · 5 अंक]`

यदि $A=\begin{bmatrix} 0 & -\tan \dfrac{\alpha}{2} \\ \tan \dfrac{\alpha}{2} & 0 \end{bmatrix}$ तथा $I$ कोटि $2$ का तत्समक आव्यूह है, तो सिद्ध कीजिए कि
$I+A=(I-A)\begin{bmatrix} \cos \alpha & -\sin \alpha \\ \sin \alpha & \cos \alpha \end{bmatrix}$ ।

**उत्तर:** <!-- यह हल पुस्तक में हस्तलिखित छपा है (handwritten block) -->
यहाँ, $A = \begin{bmatrix} 0 & -t \\ t & 0 \end{bmatrix}$, जहाँ $t = \tan\frac{\alpha}{2}$
अब, $\cos\alpha = \frac{1 - \tan^2\frac{\alpha}{2}}{1 + \tan^2\frac{\alpha}{2}} = \frac{1 - t^2}{1 + t^2}$
तथा $\sin\alpha = \frac{2\tan\frac{\alpha}{2}}{1 + \tan^2\frac{\alpha}{2}} = \frac{2t}{1 + t^2}$
दायाँ पक्ष $= (I - A)\begin{bmatrix} \cos\alpha & -\sin\alpha \\ \sin\alpha & \cos\alpha \end{bmatrix}$
$= \left(\begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} - \begin{bmatrix} 0 & -t \\ t & 0 \end{bmatrix}\right)\begin{bmatrix} \frac{1 - t^2}{1 + t^2} & \frac{-2t}{1 + t^2} \\ \frac{2t}{1 + t^2} & \frac{1 - t^2}{1 + t^2} \end{bmatrix}$
$= \begin{bmatrix} 1 & t \\ -t & 1 \end{bmatrix}\begin{bmatrix} \frac{1 - t^2}{1 + t^2} & \frac{-2t}{1 + t^2} \\ \frac{2t}{1 + t^2} & \frac{1 - t^2}{1 + t^2} \end{bmatrix}$
$= \begin{bmatrix} \frac{1 - t^2 + 2t^2}{1 + t^2} & \frac{-2t + t(1 - t^2)}{1 + t^2} \\ \frac{-t(1 - t^2) + 2t}{1 + t^2} & \frac{2t^2 + 1 - t^2}{1 + t^2} \end{bmatrix}$
$= \begin{bmatrix} \frac{1 + t^2}{1 + t^2} & \frac{-t(1 + t^2)}{1 + t^2} \\ \frac{t(1 + t^2)}{1 + t^2} & \frac{1 + t^2}{1 + t^2} \end{bmatrix} = \begin{bmatrix} 1 & -t \\ t & 1 \end{bmatrix}$
$= \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} + \begin{bmatrix} 0 & -t \\ t & 0 \end{bmatrix} = \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} + \begin{bmatrix} 0 & -\tan\frac{\alpha}{2} \\ \tan\frac{\alpha}{2} & 0 \end{bmatrix} = I + A =$ बायाँ पक्ष
बायाँ पक्ष $=$ दायाँ पक्ष **इति सिद्धम्**

---

**प्र. 14**  `[2025 · 5 अंक]`

⚠ **Board ka jaal:** $7I$ में 7 केवल विकर्ण पर आता है, हर अवयव पर नहीं; इसे अनदेखा करना पूरे उत्तर को बिगाड़ देता है।
⚠ **Board ka jaal:** व्युत्क्रम की पुष्टि में $AB = I$ **और** $BA = I$ दोनों दिखाइए; एक ओर का गुणनफल अधूरा सत्यापन है।

यदि $A=\begin{bmatrix}3 & 1\\ -1 & 2\end{bmatrix}$ है तो दर्शाइए कि $A^{2}-5A+7I=0$ है। इसकी सहायता से $A^{-1}$ ज्ञात कीजिए।

**उत्तर:** $A^{2} = \begin{bmatrix}3 & 1 \\ -1 & 2\end{bmatrix}\begin{bmatrix}3 & 1 \\ -1 & 2\end{bmatrix} = \begin{bmatrix}8 & 5 \\ -5 & 3\end{bmatrix}$

$\therefore A^{2} - 5A + 7I = \begin{bmatrix}8-15+7 & 5-5 \\ -5+5 & 3-10+7\end{bmatrix} = \begin{bmatrix}0 & 0 \\ 0 & 0\end{bmatrix} = O$  **इति सिद्धम्**

दोनों पक्षों को $A^{-1}$ से गुणा करने पर $A - 5I + 7A^{-1} = O$

$\Rightarrow A^{-1} = \frac{1}{7}(5I - A) = \frac{1}{7}\begin{bmatrix}2 & -1 \\ 1 & 3\end{bmatrix}$

**जाँच:** $A \cdot A^{-1} = \frac{1}{7}\begin{bmatrix}6+1 & -3+3 \\ -2+2 & 1+6\end{bmatrix} = \begin{bmatrix}1 & 0 \\ 0 & 1\end{bmatrix} = I$

---

**प्र. 15**  `[2025 · 5 अंक]`

⚠ **Board ka jaal:** व्युत्क्रम की पुष्टि में $AB = I$ **और** $BA = I$ दोनों दिखाइए; एक ओर का गुणनफल अधूरा सत्यापन है।

यदि $A$ तथा $B$, $n$ क्रम के दो आव्यूह हैं जो व्युत्क्रमणीय हैं तब सिद्ध करें कि $(AB)^{-1}=B^{-1}A^{-1}$।

**उत्तर:** दिया है, $A$ तथा $B$ व्युत्क्रमणीय वर्ग आव्यूह हैं।
सिद्ध करना है $(AB)^{-1} = B^{-1}A^{-1}$
**उपपत्ति** गुणन के साहचर्य नियम से,
$AB(B^{-1}A^{-1}) = A(BB^{-1})A^{-1} = AIA^{-1}$ $[\because BB^{-1} = I]$
$= AA^{-1}$ $[\because AI = A]$
$= I$ …(i)
इसी प्रकार, $(B^{-1}A^{-1})AB = B^{-1}(A^{-1}A)B = B^{-1}IB$ $[\because A^{-1}A = I]$
$= B^{-1}B = I$ $[\because IB = B]$
$\therefore AB(B^{-1}A^{-1}) = (B^{-1}A^{-1})AB = I$ …(ii)
समी (i) तथा (ii) से, $AB(B^{-1}A^{-1}) = I = (B^{-1}A^{-1})AB$
अतः $B^{-1}A^{-1}$, $AB$ का व्युत्क्रम है।
$(AB)^{-1} = B^{-1}A^{-1}$ $[\because AA^{-1} = A^{-1}A = I]$ -----------**[1 अंक]**
**इति सिद्धम्**

---

**प्र. 16**  `[2025 · 8 अंक]`

यदि $F(x)=\begin{bmatrix}\cos x & -\sin x & 0 \\ \sin x & \cos x & 0 \\ 0 & 0 & 1\end{bmatrix}$, तो सिद्ध कीजिए कि $F(x)\,F(y)=F(x+y)$.

**उत्तर:** बायाँ पक्ष $= F(x) \cdot F(y)$
/Users/saumyaladdha/Downloads/physics_new.md
$= F(x + y) =$ दायाँ पक्ष -----------**[2 अंक]**

---

**प्र. 17**  `[2025 · 8 अंक]`

⚠ **Board ka jaal:** $11I$ में 11 केवल विकर्ण पर आता है, हर अवयव पर नहीं; इसे अनदेखा करना पूरे उत्तर को बिगाड़ देता है।
⚠ **Board ka jaal:** व्युत्क्रम की पुष्टि में $AB = I$ **और** $BA = I$ दोनों दिखाइए; एक ओर का गुणनफल अधूरा सत्यापन है।

आव्यूह $A=\begin{bmatrix}1&1&1\\1&2&-3\\2&-1&3\end{bmatrix}$ के लिए दर्शाइए कि $A^{3}-6A^{2}+5A+11I=0$ है। इसकी सहायता से $A^{-1}$ ज्ञात कीजिए।

**उत्तर:** $A^{2} = \begin{bmatrix}4 & 2 & 1 \\ -3 & 8 & -14 \\ 7 & -3 & 14\end{bmatrix}$,  $A^{3} = \begin{bmatrix}8 & 7 & 1 \\ -23 & 27 & -69 \\ 32 & -13 & 58\end{bmatrix}$

$A^{3} - 6A^{2} + 5A + 11I$ के प्रत्येक अवयव की गणना करने पर शून्य आव्यूह प्राप्त होता है;
जैसे $(1,1)$: $8 - 24 + 5 + 11 = 0$ तथा $(3,3)$: $58 - 84 + 15 + 11 = 0$।

$\therefore A^{3} - 6A^{2} + 5A + 11I = O$  **इति सिद्धम्**

अब दोनों पक्षों को $A^{-1}$ से गुणा करने पर $A^{2} - 6A + 5I + 11A^{-1} = O$

$\Rightarrow A^{-1} = -\frac{1}{11}\left(A^{2} - 6A + 5I\right) = \frac{1}{11}\begin{bmatrix}-3 & 4 & 5 \\ 9 & -1 & -4 \\ 5 & -3 & -1\end{bmatrix}$

**जाँच:** $A$ की पहली पंक्ति $[1\;1\;1]$ को $11A^{-1}$ के पहले स्तम्भ $[-3,\,9,\,5]$ से गुणा करने पर $-3 + 9 + 5 = 11$, अर्थात् $\frac{11}{11} = 1$।

---

## 2024

**प्र. 18**  `[2020 · 2023 · 2024 · 1 अंक]`  ★★★

🧮 **Calculation me galti:** परिवर्त में केवल स्थान बदलते हैं, चिह्न या मान नहीं; करणी-अवयव ज्यों-के-त्यों रहते हैं।
🧮 **Calculation me galti:** आधे वाले गुणांक को अंत तक साथ ले चलिए; उसे छोड़ देने पर उत्तर दुगना आ जाता है।

🔁 **यह सवाल 3 बार पूछा जा चुका है।** अगली बार आए तो free marks।

(ङ) आव्यूह $A=\begin{bmatrix} \cos\alpha & -\sin\alpha \\ \sin\alpha & \cos\alpha \end{bmatrix}$ तथा $A+A'=I$ तो $\alpha$ का मान होगा
(i) $\frac{\pi}{6}$
(ii) $\frac{\pi}{3}$
(iii) $\pi$
(iv) $\frac{3\pi}{2}$

**उत्तर:** (b) दिया है, $A + A' = I$
$\begin{bmatrix} \cos\alpha & -\sin\alpha \\ \sin\alpha & \cos\alpha \end{bmatrix} + \begin{bmatrix} \cos\alpha & \sin\alpha \\ -\sin\alpha & \cos\alpha \end{bmatrix} = \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix}$
$\Rightarrow \begin{bmatrix} 2\cos\alpha & 0 \\ 0 & 2\cos\alpha \end{bmatrix} = \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix} \Rightarrow 2\cos\alpha = 1$
$\Rightarrow \cos\alpha = \frac{1}{2} \Rightarrow \alpha = \frac{\pi}{3}$

---

**प्र. 19**  `[2023 · 2024 · 1 अंक]`  ★★

🧮 **Calculation me galti:** आधे वाले गुणांक को अंत तक साथ ले चलिए; उसे छोड़ देने पर उत्तर दुगना आ जाता है।

(ग) यदि $\begin{bmatrix} 2x-y & x+2y \\ 2 & 3 \end{bmatrix}=\begin{bmatrix} 1 & 3 \\ 2 & 3 \end{bmatrix}$, तो $x$ और $y$ का मान होगा :
(i) $x=1,\ y=1$
(ii) $x=2,\ y=1$
(iii) $x=\frac{1}{2},\ y=\frac{1}{2}$
(iv) $x=1,\ y=\frac{1}{2}$

**उत्तर:** (a) दिया है, $\begin{bmatrix} 2x - y & x + 2y \\ 2 & 3 \end{bmatrix} = \begin{bmatrix} 1 & 3 \\ 2 & 3 \end{bmatrix}$
संगत अवयवों की तुलना करने पर,
$2x - y = 1$ …(i)
$x + 2y = 3$ …(ii)
समी (i) व (ii) को हल करने पर, $x = 1$ तथा $y = 1$

---

**प्र. 20**  `[2024 · 1 अंक]`

⚠ **Board ka jaal:** व्युत्क्रम की पुष्टि में $AB = I$ **और** $BA = I$ दोनों दिखाइए; एक ओर का गुणनफल अधूरा सत्यापन है।

(ङ) यदि $A$ तथा $B$ दो व्युत्क्रमणीय आव्यूह कोटि $n$ के हैं तो
(i) $(AB)^{-1}=B^{-1}A^{-1}$
(ii) $(AB)^{-1}=A^{-1}B^{-1}$
(iii) $(AB)^{-1}=A^{-1}B$
(iv) $(AB)^{-1}=AB^{-1}$

**उत्तर:** (i) $(AB)^{-1} = B^{-1}A^{-1}$

$(AB)(B^{-1}A^{-1}) = A(BB^{-1})A^{-1} = AIA^{-1} = AA^{-1} = I$; इसी प्रकार $(B^{-1}A^{-1})(AB) = I$।
व्युत्क्रम लेने पर क्रम पलट जाता है।

---

**प्र. 21**  `[2020 · 2024 · 2 अंक]`  ★★

$x$ तथा $y$ ज्ञात कीजिए यदि $2\begin{bmatrix}1 & 3 \\ 0 & x\end{bmatrix}+\begin{bmatrix}y & 0 \\ 1 & 2\end{bmatrix}=\begin{bmatrix}5 & 6 \\ 1 & 8\end{bmatrix}$।

**उत्तर:** दिया है, $2\begin{bmatrix} 1 & 3 \\ 0 & x \end{bmatrix} + \begin{bmatrix} y & 0 \\ 1 & 2 \end{bmatrix} = \begin{bmatrix} 5 & 6 \\ 1 & 8 \end{bmatrix}$
$\Rightarrow \begin{bmatrix} 2 + y & 6 + 0 \\ 0 + 1 & 2x + 2 \end{bmatrix} = \begin{bmatrix} 5 & 6 \\ 1 & 8 \end{bmatrix}$ -----------**[½ अंक]**
$\Rightarrow \begin{bmatrix} 2 + y & 6 \\ 1 & 2x + 2 \end{bmatrix} = \begin{bmatrix} 5 & 6 \\ 1 & 8 \end{bmatrix}$
समान आव्यूह की परिभाषा से, हम जानते हैं कि ज्ञात आव्यूह समान हैं, तो इनके संगत अवयव भी समान होंगे।
अब, संगत अवयवों को समान रखने पर,
$2 + y = 5$ …(i)
तथा $2x + 2 = 8$ …(ii)
$\Rightarrow y = 5 - 2 = 3$
तथा $2x = 8 - 2 \Rightarrow x = \frac{6}{2} = 3$ -----------**[½ अंक]**

---

**प्र. 22**  `[2024 · 2 अंक]`

⚠ **Board ka jaal:** गुणन में क्रम मायने रखता है ($AB \ne BA$); क्रम बदलकर हल करना ग़लत निकाय देता है।

यदि $A=\begin{bmatrix}1 & -2 & 3 \\ -4 & 2 & 5\end{bmatrix}$ और $B=\begin{bmatrix}2 & 3 \\ 4 & 5 \\ 2 & 1\end{bmatrix}$ है तो $AB$ तथा $BA$ ज्ञात कीजिए।

**उत्तर:** $AB = \begin{bmatrix} 1 & -2 & 3 \\ -4 & 2 & 5 \end{bmatrix} \times \begin{bmatrix} 2 & 3 \\ 4 & 5 \\ 2 & 1 \end{bmatrix}$
$= \begin{bmatrix} 2 - 8 + 6 & 3 - 10 + 3 \\ -8 + 8 + 10 & -12 + 10 + 5 \end{bmatrix} = \begin{bmatrix} 0 & -4 \\ 10 & 3 \end{bmatrix}$ -----------**[1 अंक]**

---

**प्र. 23**  `[2024 · 5 अंक]`

यदि आव्यूह $X+Y=\begin{bmatrix}5 & 2 \\ 0 & 9\end{bmatrix}$ तथा आव्यूह $X-Y=\begin{bmatrix}3 & 6 \\ 0 & -1\end{bmatrix}$ हैं तो $X$ और $Y$ आव्यूहों को ज्ञात कीजिए।

**उत्तर:** दिया है  2A + 3X = 5B

या  2A + 3X $-$ 2A = 5B $-$ 2A  (आव्यूह योग क्रम-विनिमेय है)

या  2A $-$ 2A + 3X = 5B $-$ 2A

या  0 + 3X = 5B $-$ 2A
                                    ($-$ 2A, आव्यूह 2A का योग प्रतिलोम है)

या  3X = 5B $-$ 2A

या  X = **1/3 (5B $-$ 2A)**

या  X = 1/3 (5 [2  $- 2$; 4  2; $- 5$  1] $-$ 2 [8  0; 4  $- 2$; 3  6])

या  X = 1/3 ([10  $- 10$; 20  10; $- 25$  5] + [$- 16$  0; $- 8$  4; $- 6$  $- 12$])

$\Rightarrow$  X = 1/3 [$- 6$  $- 10$; 12  14; $- 31$  $- 7$]

$\therefore$  X = [$- 2$  $- 10/3$; 4  14/3; $- 31/3$  $- 7/3$]

---

## 2023

**प्र. 24**  `[2023 · 1 अंक]`

(ख) यदि $A=\begin{bmatrix}0 & 1\\1 & 0\end{bmatrix}$ तथा $B=\begin{bmatrix}1 & 0\\0 & -1\end{bmatrix}$, तब $BA$ होगा
(i) $\begin{bmatrix}-1 & 0\\0 & 1\end{bmatrix}$
(ii) $\begin{bmatrix}0 & -1\\1 & 0\end{bmatrix}$
(iii) $\begin{bmatrix}0 & -1\\-1 & 0\end{bmatrix}$
(iv) $\begin{bmatrix}0 & 1\\-1 & 0\end{bmatrix}$

**उत्तर:** (d) $A = \begin{bmatrix} 0 & 1 \\ 1 & 0 \end{bmatrix}$ तथा $B = \begin{bmatrix} 1 & 0 \\ 0 & -1 \end{bmatrix}$
$BA = \begin{bmatrix} 1 & 0 \\ 0 & -1 \end{bmatrix}\begin{bmatrix} 0 & 1 \\ 1 & 0 \end{bmatrix} = \begin{bmatrix} 0 + 0 & 1 + 0 \\ 0 - 1 & 0 + 0 \end{bmatrix} = \begin{bmatrix} 0 & 1 \\ -1 & 0 \end{bmatrix}$

---

**प्र. 25**  `[2023 · 1 अंक]`

यदि $A=\begin{bmatrix}2&4\\3&2\end{bmatrix}$ तथा $B=\begin{bmatrix}1&3\\-2&5\end{bmatrix}$ हैं, तो $(A+B)$ तथा $(A-B)$ का मान ज्ञात कीजिए।

**उत्तर:** दिया है, $A = \begin{bmatrix} 2 & 4 \\ 3 & 2 \end{bmatrix}$ तथा $B = \begin{bmatrix} 1 & 3 \\ -2 & 5 \end{bmatrix}$
$B \cdot A = \begin{bmatrix} 1 & 3 \\ -2 & 5 \end{bmatrix}\begin{bmatrix} 2 & 4 \\ 3 & 2 \end{bmatrix}$
$= \begin{bmatrix} 1 \times 2 + 3 \times 3 & 1 \times 4 + 3 \times 2 \\ -2 \times 2 + 5 \times 3 & -2 \times 4 + 5 \times 2 \end{bmatrix} = \begin{bmatrix} 11 & 10 \\ 11 & 2 \end{bmatrix}$ -----------**[1 अंक]**

---

**प्र. 26**  `[2023 · 2 अंक]`

यदि $\begin{bmatrix} x+z \\ y+z \\ x+y+z \end{bmatrix} = \begin{bmatrix} 5 \\ 7 \\ 9 \end{bmatrix}$ है, तो $x$, $y$ तथा $z$ का मान ज्ञात कीजिए।

**उत्तर:** दिया है, $\begin{bmatrix} x + z \\ y + z \\ x + y + z \end{bmatrix} = \begin{bmatrix} 5 \\ 7 \\ 9 \end{bmatrix}$

<!-- page 05 (book p.25) -->

दोनों पक्षों की तुलना करने पर,
$x + z = 5$ …(i)
$y + z = 7$ …(ii)
$x + y + z = 9$ …(iii)
समी (ii) व (iii) से,
$x + 7 = 9 \Rightarrow x = 9 - 7 = 2$ -----------**[1 अंक]**
$x$ का मान समी (i) में रखने पर, $2 + z = 5 \Rightarrow z = 5 - 2 = 3$
$z$ का मान समी (ii) में रखने पर, $y + 3 = 7 \Rightarrow y = 7 - 3 = 4$
अतः $x = 2$, $y = 4$ तथा $z = 3$ हैं। -----------**[1 अंक]**

---

**प्र. 27**  `[2023 · 2 अंक]`

यदि $A=\begin{bmatrix}\cos\theta & \sin\theta \\ -\sin\theta & \cos\theta\end{bmatrix}$, तो सिद्ध कीजिए कि $A^{3}=\begin{bmatrix}\cos3\theta & \sin3\theta \\ -\sin3\theta & \cos3\theta\end{bmatrix}$।

**उत्तर:** <!-- यह हल पुस्तक में हस्तलिखित छपा है (handwritten block) -->
दिया है, $A = \begin{bmatrix} \cos\theta & \sin\theta \\ -\sin\theta & \cos\theta \end{bmatrix}$
$A^2 = A \cdot A = \begin{bmatrix} \cos\theta & \sin\theta \\ -\sin\theta & \cos\theta \end{bmatrix}\begin{bmatrix} \cos\theta & \sin\theta \\ -\sin\theta & \cos\theta \end{bmatrix}$
$= \begin{bmatrix} \cos^2\theta - \sin^2\theta & \sin\theta \cos\theta + \sin\theta \cos\theta \\ -\sin\theta \cos\theta - \sin\theta \cos\theta & -\sin^2\theta + \cos^2\theta \end{bmatrix}$
$= \begin{bmatrix} \cos 2\theta & \sin 2\theta \\ -\sin 2\theta & \cos 2\theta \end{bmatrix}$ $[\because \cos^2\theta - \sin^2\theta = \cos 2\theta$ तथा $2\sin\theta \cos\theta = \sin 2\theta]$
$A^3 = A^2 \cdot A = \begin{bmatrix} \cos 2\theta & \sin 2\theta \\ -\sin 2\theta & \cos 2\theta \end{bmatrix}\begin{bmatrix} \cos\theta & \sin\theta \\ -\sin\theta & \cos\theta \end{bmatrix}$
$= \begin{bmatrix} \cos 2\theta \cos\theta - \sin 2\theta \sin\theta & \cos 2\theta \sin\theta + \sin 2\theta \cos\theta \\ -\sin 2\theta \cos\theta - \cos 2\theta \sin\theta & -\sin 2\theta \sin\theta + \cos 2\theta \cos\theta \end{bmatrix}$
$= \begin{bmatrix} \cos 3\theta & \sin 3\theta \\ -\sin 3\theta & \cos 3\theta \end{bmatrix}$ **इति सिद्धम्**

<!-- page 06 (book p.26) -->

---

**प्र. 28**  `[2023 · 2 अंक]`

⚠ **Board ka jaal:** व्युत्क्रम की पुष्टि में $AB = I$ **और** $BA = I$ दोनों दिखाइए; एक ओर का गुणनफल अधूरा सत्यापन है।
🧮 **Calculation me galti:** परिवर्त में केवल स्थान बदलते हैं, चिह्न या मान नहीं; करणी-अवयव ज्यों-के-त्यों रहते हैं।

यदि $A$ तथा $B$ दो व्युत्क्रमणीय आव्यूह कोटि $n$ के हैं तो सिद्ध कीजिए कि $(AB)^{-1}=B^{-1}.A^{-1}$।

**उत्तर:** A = $\begin{bmatrix}1 & -1 & 5 \\ -1 & 2 & 1 \\ 5 & 1 & 3\end{bmatrix}$

$\Rightarrow$  $A '$ = [ 1  $- 1$  5 ; $- 1$  2  1 ; 5  1  3 ]  (परिवर्त, जो A के बराबर है) ← A का परिवर्त (पंक्तियाँ ↔ स्तम्भ)

$\Rightarrow$  $A '$ = **A**,

इसलिए आव्यूह A एक सममित आव्यूह है।  इति सिद्धम्

---

**प्र. 29**  `[2023 · 4 अंक]`

⚠ **Board ka jaal:** $-4I$ में 4 केवल विकर्ण पर आता है, हर अवयव पर नहीं; इसे अनदेखा करना पूरे उत्तर को बिगाड़ देता है।
⚠ **Board ka jaal:** व्युत्क्रम की पुष्टि में $AB = I$ **और** $BA = I$ दोनों दिखाइए; एक ओर का गुणनफल अधूरा सत्यापन है।

सिद्ध कीजिए कि आव्यूह $A=\begin{bmatrix}2 & 3 \\ 1 & 2\end{bmatrix}$ समीकरण $A^{2}-4A+I_{2}=0$ को संतुष्ट करता है जहाँ $I_{2}$ एक $2\times2$ तद्समक आव्यूह तथा $O$ एक $2\times2$ शून्य आव्यूह है। इसकी सहायता से $A^{-1}$ ज्ञात कीजिए।

**उत्तर:** $A^{2} = \begin{bmatrix}2 & 3 \\ 1 & 2\end{bmatrix}\begin{bmatrix}2 & 3 \\ 1 & 2\end{bmatrix} = \begin{bmatrix}7 & 12 \\ 4 & 7\end{bmatrix}$

$\therefore A^{2} - 4A + I_{2} = \begin{bmatrix}7-8+1 & 12-12 \\ 4-4 & 7-8+1\end{bmatrix} = \begin{bmatrix}0 & 0 \\ 0 & 0\end{bmatrix} = O$  **इति सिद्धम्**

अब दोनों पक्षों को $A^{-1}$ से गुणा करने पर $A - 4I + A^{-1} = O$

$\Rightarrow A^{-1} = 4I - A = \begin{bmatrix}2 & -3 \\ -1 & 2\end{bmatrix}$

**जाँच:** $A \cdot A^{-1} = \begin{bmatrix}4-3 & -6+6 \\ 2-2 & -3+4\end{bmatrix} = \begin{bmatrix}1 & 0 \\ 0 & 1\end{bmatrix} = I$

---

**प्र. 30**  `[2023 · 5 अंक]`

मान लीजिए कि $A=\begin{bmatrix}2 & -1\\3 & 4\end{bmatrix},\; B=\begin{bmatrix}5 & 2\\7 & 4\end{bmatrix},\; C=\begin{bmatrix}2 & 5\\3 & 8\end{bmatrix}$ है। तो एक ऐसा आव्यूह $D$ ज्ञात कीजिए कि $CD-AB=0$ हो।

**उत्तर:** $A$, $B$, $C$ कोटि 2 के वर्ग आव्यूह हैं, इसलिए $D$ भी कोटि 2 का वर्ग आव्यूह होगा।

मान लीजिए $D = \begin{bmatrix}a & b \\ c & d\end{bmatrix}$। तब $CD - AB = O$ से

$\begin{bmatrix}2a+5c-3 & 2b+5d \\ 3a+8c-43 & 3b+8d-22\end{bmatrix} = \begin{bmatrix}0 & 0 \\ 0 & 0\end{bmatrix}$

$2a + 5c = 3$ …(i) $\cdot$ $3a + 8c = 43$ …(ii) $\cdot$ $2b + 5d = 0$ …(iii) $\cdot$ $3b + 8d = 22$ …(iv)

(i) व (ii) से $a = -191$, $c = 77$; (iii) व (iv) से $b = -110$, $d = 44$।

$\therefore D = \begin{bmatrix}-191 & -110 \\ 77 & 44\end{bmatrix}$

---

**प्र. 31**  `[2023 · 5 अंक]`

🧮 **Calculation me galti:** आधे वाले गुणांक को अंत तक साथ ले चलिए; उसे छोड़ देने पर उत्तर दुगना आ जाता है।

यदि $A=\begin{bmatrix}8&0\\4&-2\\3&6\end{bmatrix},\ B=\begin{bmatrix}2&-2\\4&2\\-5&1\end{bmatrix}$ तथा $2A+3X=5B$ हो, तो आव्यूह $X$ ज्ञात कीजिए।

**उत्तर:** $A = \begin{bmatrix} 8 & 0 \\ 4 & -2 \\ 3 & 6 \end{bmatrix}$, $B = \begin{bmatrix} 2 & -2 \\ 4 & 2 \\ -5 & 1 \end{bmatrix}$
$\therefore 2A + 3X = 5B$
$\Rightarrow 2\begin{bmatrix} 8 & 0 \\ 4 & -2 \\ 3 & 6 \end{bmatrix} + 3X = 5\begin{bmatrix} 2 & -2 \\ 4 & 2 \\ -5 & 1 \end{bmatrix}$ [2½]
$\Rightarrow 3X = \begin{bmatrix} 10 & -10 \\ 20 & 10 \\ -25 & 5 \end{bmatrix} - \begin{bmatrix} 16 & 0 \\ 8 & -4 \\ 6 & 12 \end{bmatrix}$
$\Rightarrow 3X = \begin{bmatrix} -6 & -10 \\ 12 & 14 \\ -31 & -7 \end{bmatrix}$
$\therefore X = \begin{bmatrix} -2 & \frac{-10}{3} \\ 4 & \frac{14}{3} \\ \frac{-31}{3} & \frac{-7}{3} \end{bmatrix}$ [2½]

---

**प्र. 32**  `[2023 · 5 अंक]`

⚠ **Board ka jaal:** व्युत्क्रम की पुष्टि में $AB = I$ **और** $BA = I$ दोनों दिखाइए; एक ओर का गुणनफल अधूरा सत्यापन है।

यदि $A = \begin{bmatrix} 2 & 3 \\ 1 & -4 \end{bmatrix}$ तथा $B = \begin{bmatrix} 1 & -2 \\ -1 & 3 \end{bmatrix}$ हो, तो सिद्ध कीजिए कि $(AB)^{-1} = B^{-1}A^{-1}$।

**उत्तर:** यहाँ  B′ = $\begin{bmatrix}2 & -1 & 1 \\ -2 & 3 & -2 \\ -4 & 4 & -3\end{bmatrix}$

मान लीजिए कि
P = 1/2 (B + $B '$)

  = 1/2 ( [  2  $- 2$  $- 4$ ]  +  [  2  $- 1$  1 ] )
         ( [ $- 1$  3  4 ]  [ $- 2$  3  $- 2$ ] )
         ( [  1  $- 2$  $- 3$ ]  [ $- 4$  4  $- 3$ ] )

  = 1/2 [ 4, $- 3$, $- 3$ ; $- 3$, 6, 2 ; $- 3$, 2, $- 6$ ]

  = $\begin{bmatrix}2 & -3/2 & -3/2 \\ -3/2 & 3 & 1 \\ -3/2 & 1 & -3\end{bmatrix}$  है।

अब,
P′ = $\begin{bmatrix}2 & -3/2 & -3/2 \\ -3/2 & 3 & 1 \\ -3/2 & 1 & -3\end{bmatrix}$  = P

अतः
P = 1/2 (B + $B '$) एक सममित आव्यूह है।

साथ ही मान लीजिए,  Q = 1/2 (B $-$ $B '$)

= 1/2 [ 0, $- 1$, $- 5$ ; 1, 0, 6 ; 5, $- 6$, 0 ]  =  [ 0  $- 1/2$  $- 5/2$ ; 1/2  0  3 ; 5/2  $- 3$  0 ] है।

तब,  $Q '$ = $Q '$ = [ 0, 1/2, 5/2 ; $- 1/2$, 0, $- 3$ ; $- 5/2$, 3, 0 ] = $-$ Q

अतः  Q = 1/2 (B $-$ $B '$) एक विषम सममित आव्यूह है।

अब  P + Q = $\begin{bmatrix}2 & -3/2 & -3/2 \\ -3/2 & 3 & 1 \\ -3/2 & 1 & -3\end{bmatrix}$  +  $\begin{bmatrix}0 & -1/2 & -5/2 \\ 1/2 & 0 & 3 \\ 5/2 & -3 & 0\end{bmatrix}$

अब  P + Q = $\begin{bmatrix}2 & -2 & -4 \\ -1 & 3 & 4 \\ 1 & -2 & -3\end{bmatrix}$ = B

अतः, आव्यूह B एक सममित आव्यूह तथा एक विषम सममित आव्यूह के योगफल के रूप में व्यक्त किया गया।  उत्तर

---

**प्र. 33**  `[2023 · 8 अंक]`

⚠ **Board ka jaal:** व्युत्क्रम की पुष्टि में $AB = I$ **और** $BA = I$ दोनों दिखाइए; एक ओर का गुणनफल अधूरा सत्यापन है।

प्रारम्भिक रूपान्तरणों के द्वारा आव्यूह $A=\begin{bmatrix}2&0&-1\\5&1&0\\0&1&3\end{bmatrix}$ का व्युत्क्रम ज्ञात कीजिए।

**उत्तर:** दिया है,  A = [ 1  2  $- 3$ ]  B = [ 3  $- 1$  2 ]  C = [ 4  1  2 ]
              $\begin{bmatrix}5 & 0 & 2 \\ 1 & -1 & 1\end{bmatrix}$ ,  $\begin{bmatrix}4 & 2 & 5 \\ 2 & 0 & 3\end{bmatrix}$  तथा  $\begin{bmatrix}0 & 3 & 2 \\ 1 & -2 & 3\end{bmatrix}$

अतः  A + B = [ 1  2  $- 3$ ]  [ 3  $- 1$  2 ]  [ **4**  1  $- 1$ ]
              [ 5  0  2 ] + [ 4  2  5 ] = [ 9  **2**  7 ]
              [ 1  $- 1$  1 ]  [ 2  0  3 ]  [ **3**  $- 1$  4 ]

तथा  B $-$ C = [ 3  $- 1$  2 ]  [ 4  1  2 ]  [ **$- 1$**  $- 2$  0 ]
              [ 4  2  5 ] - [ 0  3  2 ] = [ 4  $- 1$  **3** ]
              [ 2  0  3 ]  [ 1  $- 2$  3 ]  [ 1  **2**  0 ]

अतएव A + (B − C) = $\begin{bmatrix}1 & 2 & -3 \\ 5 & 0 & 2 \\ 1 & -1 & 1\end{bmatrix}$ + $\begin{bmatrix}-1 & -2 & 0 \\ 4 & -1 & 3 \\ 1 & 2 & 0\end{bmatrix}$ = $\begin{bmatrix}0 & 0 & -3 \\ 9 & -1 & 5 \\ 2 & 1 & 1\end{bmatrix}$

तथा (A + B) − C = $\begin{bmatrix}4 & 1 & -1 \\ 9 & 2 & 7 \\ 3 & -1 & 4\end{bmatrix}$ − $\begin{bmatrix}4 & 1 & 2 \\ 0 & 3 & 2 \\ 1 & -2 & 3\end{bmatrix}$ = $\begin{bmatrix}0 & 0 & -3 \\ 9 & -1 & 5 \\ 2 & 1 & 1\end{bmatrix}$

          इति सिद्धम्

स्पष्टया A + (B $-$ C) = (A + B) $-$ C.

---

## 2022

**प्र. 34**  `[2022 · 1 अंक]`

🧮 **Calculation me galti:** परिवर्त में केवल स्थान बदलते हैं, चिह्न या मान नहीं; करणी-अवयव ज्यों-के-त्यों रहते हैं।

यदि $A'=\begin{bmatrix}3&4\\-1&2\\0&1\end{bmatrix}$ और $B=\begin{bmatrix}-1&2&1\\1&2&3\end{bmatrix}$ तो सिद्ध कीजिए $(A-B)'=A'-B'$।

**उत्तर:** यहाँ, दायाँ पक्ष $= A' - B' = \begin{bmatrix} 3 & 4 \\ -1 & 2 \\ 0 & 1 \end{bmatrix} - \begin{bmatrix} -1 & 1 \\ 2 & 2 \\ 1 & 3 \end{bmatrix}$
$= \begin{bmatrix} 3 + 1 & 4 - 1 \\ -1 - 2 & 2 - 2 \\ 0 - 1 & 1 - 3 \end{bmatrix} = \begin{bmatrix} 4 & 3 \\ -3 & 0 \\ -1 & -2 \end{bmatrix}$ -----------**[½ अंक]**
बायाँ पक्ष $= (A - B)' = \left(\begin{bmatrix} 3 & -1 & 0 \\ 4 & 2 & 1 \end{bmatrix} - \begin{bmatrix} -1 & 2 & 1 \\ 1 & 2 & 3 \end{bmatrix}\right)'$ $[\because A = (A')']$
$= \begin{bmatrix} 3 + 1 & -1 - 2 & 0 - 1 \\ 4 - 1 & 2 - 2 & 1 - 3 \end{bmatrix}'$
$= \begin{bmatrix} 4 & -3 & -1 \\ 3 & 0 & -2 \end{bmatrix}' = \begin{bmatrix} 4 & 3 \\ -3 & 0 \\ -1 & -2 \end{bmatrix}$ -----------**[½ अंक]**
$(A - B)' = A' - B'$ **इति सिद्धम्**

<!-- page 09 (book p.29) -->

---

**प्र. 35**  `[2022 · 1 अंक]`

⚠ **Board ka jaal:** $6I$ में 6 केवल विकर्ण पर आता है, हर अवयव पर नहीं; इसे अनदेखा करना पूरे उत्तर को बिगाड़ देता है।

यदि $A=\begin{bmatrix}0 & -1 \\ 0 & 2\end{bmatrix}$ तथा $B=\begin{bmatrix}3 & 5 \\ 0 & 0\end{bmatrix}$ है तो $AB$ का मान ज्ञात कीजिए।

**उत्तर:** दिया है,  A = $\begin{bmatrix}2 & 0 & 1 \\ 2 & 1 & 3 \\ 1 & -1 & 0\end{bmatrix}$

⇒  A² = A.A = $\begin{bmatrix}2 & 0 & 1 \\ 2 & 1 & 3 \\ 1 & -1 & 0\end{bmatrix}$ $\begin{bmatrix}2 & 0 & 1 \\ 2 & 1 & 3 \\ 1 & -1 & 0\end{bmatrix}$

               = [4+0+1  0+$0 - 1$  2+0+0 ; 4+2+3  0+$1 - 3$  2+3+0 ; $2 - 2+0$  $0 - 1+0$  $1 - 3+0$]

               = $\begin{bmatrix}5 & -1 & 2 \\ 9 & -2 & 5 \\ 0 & -1 & -2\end{bmatrix}$

इसलिए $A^{2}$ $-$ 5A + 6I

= [5  $- 1$  2]  [2  0  1]  [1  0  0]
  $\begin{bmatrix}9 & -2 & 5 \\ 0 & -1 & -2\end{bmatrix}$ − 5 $\begin{bmatrix}2 & 1 & 3 \\ 1 & -1 & 0\end{bmatrix}$ + 6 $\begin{bmatrix}0 & 1 & 0 \\ 0 & 0 & 1\end{bmatrix}$

= [5  $- 1$  2]  [6  0  0]
  [9  $- 2$  5]  $-$  [10  0  5 ; 10  5  15 ; 5  $- 5$  0]  +  [0  6  0]
  [0  $- 1$  $- 2$]  [0  0  6]

= $\begin{bmatrix}5-10+6 & -1-0+0 & 2-5+0 \\ 9-10+0 & -2-5+6 & 5-15+0 \\ 0-5+0 & -1+5+0 & -2-0+6\end{bmatrix}$

= [1  $- 1$  $- 3$ ; $- 1$  $- 1$  $- 10$ ; $- 5$  4  4]

---

**प्र. 36**  `[2022 · 1 अंक]`

🧮 **Calculation me galti:** घात में प्रविष्टियों की संख्या $mn$ रखिए, कोटि $m$ या $n$ अकेले नहीं।

(ग) $3\times3$ कोटि के ऐसे आव्यूहों की कुल संख्या कितनी होगी जिनके प्रत्येक अवयव $0$ या $1$ है?
(i) $512$  (ii) $81$  (iii) $18$  (iv) $27$

**उत्तर:** (i) $512$

$3 \times 3$ आव्यूह में कुल प्रविष्टियाँ $= 3 \times 3 = 9$; प्रत्येक स्थान पर दो ही विकल्प ($0$ या $1$)।

$\therefore$ कुल आव्यूह $= 2^{9} = 512$।

---

**प्र. 37**  `[2022 · 2 अंक]`

⚠ **Board ka jaal:** गुणन में क्रम मायने रखता है ($AB \ne BA$); क्रम बदलकर हल करना ग़लत निकाय देता है।

यदि $A=\begin{bmatrix}1&2&3\\-4&2&5\end{bmatrix}$ तथा $B=\begin{bmatrix}2&3\\4&5\\3&1\end{bmatrix}$, तो $AB$ तथा $BA$ का मान ज्ञात कीजिए।

**उत्तर:** दिया है, $A = \begin{bmatrix} 1 & 2 & 3 \\ -4 & 2 & 5 \end{bmatrix}$ तथा $B = \begin{bmatrix} 2 & 3 \\ 4 & 5 \\ 3 & 1 \end{bmatrix}$
$\therefore AB = \begin{bmatrix} 1 & 2 & 3 \\ -4 & 2 & 5 \end{bmatrix}\begin{bmatrix} 2 & 3 \\ 4 & 5 \\ 3 & 1 \end{bmatrix}$
$= \begin{bmatrix} 2 + 8 + 9 & 3 + 10 + 3 \\ -8 + 8 + 15 & -12 + 10 + 5 \end{bmatrix} = \begin{bmatrix} 19 & 16 \\ 15 & 3 \end{bmatrix}$ -----------**[1 अंक]**
तथा $BA = \begin{bmatrix} 2 & 3 \\ 4 & 5 \\ 3 & 1 \end{bmatrix}\begin{bmatrix} 1 & 2 & 3 \\ -4 & 2 & 5 \end{bmatrix}$
$= \begin{bmatrix} 2 - 12 & 4 + 6 & 6 + 15 \\ 4 - 20 & 8 + 10 & 12 + 25 \\ 3 - 4 & 6 + 2 & 9 + 5 \end{bmatrix} = \begin{bmatrix} -10 & 10 & 21 \\ -16 & 18 & 37 \\ -1 & 8 & 14 \end{bmatrix}$ -----------**[1 अंक]**

---

**प्र. 38**  `[2022 · 4 अंक]`

⚠ **Board ka jaal:** $2I$ में 2 केवल विकर्ण पर आता है, हर अवयव पर नहीं; इसे अनदेखा करना पूरे उत्तर को बिगाड़ देता है।

(क) (i) यदि $A=\begin{bmatrix}1&0&2\\0&2&1\\2&0&3\end{bmatrix}$, तो सिद्ध कीजिए कि $A^{3}-6A^{2}+7A+2I=0$। (ii) वक्र $y=x^{3}+2x+6$ के उन अभिलम्बों के समीकरण ज्ञात कीजिए, जो रेखा $x+14y+4=0$ के समांतर हैं।

**उत्तर:**

A + B = $\begin{bmatrix}0 & 7 & 8 \\ -5 & 0 & 10 \\ 8 & -6 & 0\end{bmatrix}$

अतएव  (A + B)C = $\begin{bmatrix}0 & 7 & 8 \\ -5 & 0 & 10 \\ 8 & -6 & 0\end{bmatrix}$ $\begin{bmatrix}2 \\ -2 \\ 3\end{bmatrix}$

   = [ **$0 - 14+24$** ]  [ 10 ]
     [ $- 10+0+30$ ]  = [ 20 ]
     [ **16+12+0** ]  [ 28 ]

AC = $\begin{bmatrix}0 & 6 & 7 \\ -6 & 0 & 8 \\ 7 & -8 & 0\end{bmatrix}$ $\begin{bmatrix}2 \\ -2 \\ 3\end{bmatrix}$

$\Rightarrow$  AC = [ 0 $-$ 12 + 21 ]  [ 9 ]
              [ **$- 12$ + 0 + 24** ] = [ 12 ]
              [ 14 + 16 + 0 ]  [ 30 ]

और  BC = [ 0  1  1 ] [ 2 ]  [ **0 $-$ 2 + 3** ]  [ 1 ]
              [ 1  0  2 ] [ $- 2$ ] = [ 2 + 0 + 6 ] = [ 8 ]
              [ 1  2  0 ] [ 3 ]  [ **2 $-$ 4 + 0** ]  [ $- 2$ ]

इसलिए  AC + BC = [ 9 ]  [ 1 ]  [ 10 ]
              [ 12 ] + [ 8 ] = [ 20 ]
              [ 30 ]  [ $- 2$ ]  [ 28 ]

स्पष्टया  (A + B)C = AC + BC.  इति सिद्धम्

---

**प्र. 39**  `[2022 · 4 अंक]`

⚠ **Board ka jaal:** व्युत्क्रम की पुष्टि में $AB = I$ **और** $BA = I$ दोनों दिखाइए; एक ओर का गुणनफल अधूरा सत्यापन है।

(क) प्रारम्भिक संक्रियाओं के प्रयोग द्वारा निम्नलिखित आव्यूह का व्युत्क्रम ज्ञात कीजिए : $A=\begin{bmatrix}1&3&-2\\-3&0&-5\\2&5&0\end{bmatrix}$

**उत्तर:** दिया है :  2 $\begin{bmatrix}x & z \\ y & t\end{bmatrix}$ + 3 $\begin{bmatrix}1 & -1 \\ 0 & 2\end{bmatrix}$ = 3 $\begin{bmatrix}3 & 5 \\ 4 & 6\end{bmatrix}$

⇒  $\begin{bmatrix}2x & 2z \\ 2y & 2t\end{bmatrix}$ + $\begin{bmatrix}3 & -3 \\ 0 & 6\end{bmatrix}$ = $\begin{bmatrix}9 & 15 \\ 12 & 18\end{bmatrix}$

$\Rightarrow$  [ **2x + 3**  2z $-$ 3 ] = [ 9  15 ]
    [ 2y  **2t + 6** ]  [ 12  18 ]

तुलना करने पर,

2x + 3 = 9 ...(i),  2z $-$ 3 = 15 ... (ii),  2y = 12 ...(iii),  2t + 6 = 18 ...(iv)

समीकरण (i) से,  x = **3**
समीकरण (ii) से,  z = **9**
समीकरण (iii) से,  y = **6**
समीकरण (iv) से,  t = **6**

---

**प्र. 40**  `[2022 · 5 अंक]`

🧮 **Calculation me galti:** परिवर्त में केवल स्थान बदलते हैं, चिह्न या मान नहीं; करणी-अवयव ज्यों-के-त्यों रहते हैं।
🧮 **Calculation me galti:** आधे वाले गुणांक को अंत तक साथ ले चलिए; उसे छोड़ देने पर उत्तर दुगना आ जाता है।

(ङ) आव्यूह $A=\begin{bmatrix}3 & 3 & -1\\-2 & -2 & 1\\-4 & -5 & 2\end{bmatrix}$ को एक सममित आव्यूह तथा एक विषम-सममित आव्यूह के योगफल के रूप में व्यक्त कीजिए।

**उत्तर:** दिया है, $A = \begin{bmatrix} 3 & 3 & -1 \\ -2 & -2 & 1 \\ -4 & -5 & 2 \end{bmatrix} \Rightarrow A' = \begin{bmatrix} 3 & -2 & -4 \\ 3 & -2 & -5 \\ -1 & 1 & 2 \end{bmatrix}$
माना $A = P + Q$ …(i)
जहाँ, $P = \frac{1}{2}(A + A')$ तथा $Q = \frac{1}{2}(A - A')$
अब, $P = \frac{1}{2}\left(\begin{bmatrix} 3 & 3 & -1 \\ -2 & -2 & 1 \\ -4 & -5 & 2 \end{bmatrix} + \begin{bmatrix} 3 & -2 & -4 \\ 3 & -2 & -5 \\ -1 & 1 & 2 \end{bmatrix}\right)$
$= \frac{1}{2}\begin{bmatrix} 6 & 1 & -5 \\ 1 & -4 & -4 \\ -5 & -4 & 4 \end{bmatrix} = \begin{bmatrix} 3 & \frac{1}{2} & \frac{-5}{2} \\ \frac{1}{2} & -2 & -2 \\ \frac{-5}{2} & -2 & 2 \end{bmatrix}$
$P' = \begin{bmatrix} 3 & \frac{1}{2} & \frac{-5}{2} \\ \frac{1}{2} & -2 & -2 \\ \frac{-5}{2} & -2 & 2 \end{bmatrix} = P$
अतः $P$ एक सममित आव्यूह है।
पुनः $Q = \frac{1}{2}(A - A') = \frac{1}{2}\left(\begin{bmatrix} 3 & 3 & -1 \\ -2 & -2 & 1 \\ -4 & -5 & 2 \end{bmatrix} - \begin{bmatrix} 3 & -2 & -4 \\ 3 & -2 & -5 \\ -1 & 1 & 2 \end{bmatrix}\right)$
$= \frac{1}{2}\begin{bmatrix} 0 & 5 & 3 \\ -5 & 0 & 6 \\ -3 & -6 & 0 \end{bmatrix} = \begin{bmatrix} 0 & \frac{5}{2} & \frac{3}{2} \\ \frac{-5}{2} & 0 & 3 \\ \frac{-3}{2} & -3 & 0 \end{bmatrix}$
$Q' = \begin{bmatrix} 0 & \frac{-5}{2} & \frac{-3}{2} \\ \frac{5}{2} & 0 & -3 \\ \frac{3}{2} & 3 & 0 \end{bmatrix} = -Q$
अतः $Q$ एक विषम सममित आव्यूह है।
$\therefore A =$ सममित आव्यूह $+$ विषम सममित आव्यूह [समी (i) से]
$\therefore A = \begin{bmatrix} 3 & \frac{1}{2} & \frac{-5}{2} \\ \frac{1}{2} & -2 & -2 \\ \frac{-5}{2} & -2 & 2 \end{bmatrix} + \begin{bmatrix} 0 & \frac{5}{2} & \frac{3}{2} \\ \frac{-5}{2} & 0 & 3 \\ \frac{-3}{2} & -3 & 0 \end{bmatrix}$

---

**प्र. 41**  `[2022 · 5 अंक]`

⚠ **Board ka jaal:** $2I$ में 2 केवल विकर्ण पर आता है, हर अवयव पर नहीं; इसे अनदेखा करना पूरे उत्तर को बिगाड़ देता है।

यदि $A=\begin{bmatrix}1&0&2\\0&2&1\\2&0&3\end{bmatrix}$ है तो सिद्ध कीजिए कि $A^{3}-6A^{2}+7A+2I=0$.

**उत्तर:** यहाँ, $A^2 = A \times A = \begin{bmatrix} 1 & 0 & 2 \\ 0 & 2 & 1 \\ 2 & 0 & 3 \end{bmatrix}\begin{bmatrix} 1 & 0 & 2 \\ 0 & 2 & 1 \\ 2 & 0 & 3 \end{bmatrix}$
$= \begin{bmatrix} 1 + 0 + 4 & 0 + 0 + 0 & 2 + 0 + 6 \\ 0 + 0 + 2 & 0 + 4 + 0 & 0 + 2 + 3 \\ 2 + 0 + 6 & 0 + 0 + 0 & 4 + 0 + 9 \end{bmatrix} = \begin{bmatrix} 5 & 0 & 8 \\ 2 & 4 & 5 \\ 8 & 0 & 13 \end{bmatrix}$ -----------**[1 अंक]**
$A^3 = A^2 \times A = \begin{bmatrix} 5 & 0 & 8 \\ 2 & 4 & 5 \\ 8 & 0 & 13 \end{bmatrix}\begin{bmatrix} 1 & 0 & 2 \\ 0 & 2 & 1 \\ 2 & 0 & 3 \end{bmatrix}$
$= \begin{bmatrix} 5 + 0 + 16 & 0 + 0 + 0 & 10 + 0 + 24 \\ 2 + 0 + 10 & 0 + 8 + 0 & 4 + 4 + 15 \\ 8 + 0 + 26 & 0 + 0 + 0 & 16 + 0 + 39 \end{bmatrix} = \begin{bmatrix} 21 & 0 & 34 \\ 12 & 8 & 23 \\ 34 & 0 & 55 \end{bmatrix}$ -----------**[2 अंक]**
$\therefore A^3 - 6A^2 + 7A + 2I = \begin{bmatrix} 21 & 0 & 34 \\ 12 & 8 & 23 \\ 34 & 0 & 55 \end{bmatrix} - 6\begin{bmatrix} 5 & 0 & 8 \\ 2 & 4 & 5 \\ 8 & 0 & 13 \end{bmatrix} + 7\begin{bmatrix} 1 & 0 & 2 \\ 0 & 2 & 1 \\ 2 & 0 & 3 \end{bmatrix} + 2\begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{bmatrix}$
$= \begin{bmatrix} 21 & 0 & 34 \\ 12 & 8 & 23 \\ 34 & 0 & 55 \end{bmatrix} - \begin{bmatrix} 30 & 0 & 48 \\ 12 & 24 & 30 \\ 48 & 0 & 78 \end{bmatrix} + \begin{bmatrix} 7 & 0 & 14 \\ 0 & 14 & 7 \\ 14 & 0 & 21 \end{bmatrix} + \begin{bmatrix} 2 & 0 & 0 \\ 0 & 2 & 0 \\ 0 & 0 & 2 \end{bmatrix}$
$= \begin{bmatrix} 21 - 30 + 7 + 2 & 0 & 34 - 48 + 14 + 0 \\ 12 - 12 + 0 + 0 & 8 - 24 + 14 + 2 & 23 - 30 + 7 + 0 \\ 34 - 48 + 14 + 0 & 0 & 55 - 78 + 21 + 2 \end{bmatrix}$
$= \begin{bmatrix} 0 & 0 & 0 \\ 0 & 0 & 0 \\ 0 & 0 & 0 \end{bmatrix} = O$ **इति सिद्धम्** -----------**[2 अंक]**

---

**प्र. 42**  `[2022 · 8 अंक]`

यदि $[x-5-1]\begin{bmatrix}1&0&2\\0&2&1\\2&0&3\end{bmatrix}\begin{bmatrix}x\\4\\1\end{bmatrix}=0$ है, तो $x$ का मान ज्ञात कीजिए।

**उत्तर:** यदि

$A '$ = [ 3  4 ; $- 1$  2 ; 0  1 ]

$\Rightarrow$  A = [ 3  $- 1$  0 ; 4  2  1 ] तथा B = [ $- 1$  2  1 ; 1  2  3 ]

(i)  बायाँ पक्ष = (A + B)′ = $\begin{bmatrix}2 & 1 & 1 \\ 5 & 4 & 4\end{bmatrix}$ ′ = [ 2  5 ; 1  4 ; 1  4 ]

दायाँ पक्ष = $A '$ + $B '$ = [ 3  4 ; $- 1$  2 ; 0  1 ] + [ $- 1$  1 ; 2  2 ; 1  3 ] = [ 2  5 ; 1  4 ; 1  4 ]

अतः,  बायाँ पक्ष = दायाँ पक्ष  इति सिद्धम्

(ii)  बायाँ पक्ष = (A $-$ B)$'$ = [ 4  $- 3$  $- 1$ ; 3  0  $- 2$ ] $'$ = [ 4  3 ; $- 3$  0 ; $- 1$  $- 2$ ]

दायाँ पक्ष = $A '$ $-$ $B '$ = [ 3  4 ; $- 1$  2 ; 0  1 ] $-$ [ $- 1$  1 ; 2  2 ; 1  3 ] = [ 4  3 ; $- 3$  0 ; $- 1$  $- 2$ ]

अतः,  बायाँ पक्ष = दायाँ पक्ष  इति सिद्धम्

---

## 2020

**प्र. 43**  `[2020 · 1 अंक]`

(ख) $\cos\theta\begin{bmatrix}\cos\theta & -\sin\theta\\ \sin\theta & \cos\theta\end{bmatrix}+\sin\theta\begin{bmatrix}\sin\theta & \cos\theta\\ -\cos\theta & \sin\theta\end{bmatrix}$ का मान है
(i) $\begin{bmatrix}0 & 0\\ 0 & 0\end{bmatrix}$
(ii) $\begin{bmatrix}1 & 0\\ 0 & 1\end{bmatrix}$
(iii) $\begin{bmatrix}0 & 1\\ 1 & 0\end{bmatrix}$
(iv) इनमें से कोई नहीं

**उत्तर:** (ii)

$\cos\theta\begin{bmatrix}\cos\theta & -\sin\theta \\ \sin\theta & \cos\theta\end{bmatrix} + \sin\theta\begin{bmatrix}\sin\theta & \cos\theta \\ -\cos\theta & \sin\theta\end{bmatrix}$

$= \begin{bmatrix}\cos^{2}\theta + \sin^{2}\theta & -\sin\theta \cos\theta + \sin\theta \cos\theta \\ \sin\theta \cos\theta - \sin\theta \cos\theta & \cos^{2}\theta + \sin^{2}\theta\end{bmatrix} = \begin{bmatrix}1 & 0 \\ 0 & 1\end{bmatrix}$

विकर्ण पर $\sin^{2}\theta + \cos^{2}\theta = 1$ बनता है और अविकर्ण अवयव कट जाते हैं।

---

**प्र. 44**  `[2020 · 2 अंक]`

🧮 **Calculation me galti:** घात में प्रविष्टियों की संख्या $mn$ रखिए, कोटि $m$ या $n$ अकेले नहीं।

यदि $F(x)=\begin{bmatrix}\cos x & -\sin x & 0 \\ -\sin x & \cos x & 0 \\ 0 & 0 & 1\end{bmatrix}$ है, तो सिद्ध कीजिए कि $F(x+y)=F(x)\cdot F(y)$।

⚠️ **स्रोत-नोट:** इस पेपर में $F(x)$ की $(2,1)$ प्रविष्टि $-\sin x$ छपी है। उस रूप में
$F(x)\cdot F(y)$ का $(1,1)$ अवयव $\cos(x-y)$ बनता है, $\cos(x+y)$ नहीं, इसलिए कथन वैसा
सिद्ध होता ही नहीं। इसी प्रश्न का 8-अंक वाला रूप (2025) $(2,1)$ पर $+\sin x$ छापता है।
नीचे का हल उसी घूर्णन-रूप पर है।

**उत्तर:** $F(x) \cdot F(y) = \begin{bmatrix}\cos x & -\sin x & 0 \\ \sin x & \cos x & 0 \\ 0 & 0 & 1\end{bmatrix}\begin{bmatrix}\cos y & -\sin y & 0 \\ \sin y & \cos y & 0 \\ 0 & 0 & 1\end{bmatrix}$

$= \begin{bmatrix}\cos x \cos y - \sin x \sin y & -\cos x \sin y - \sin x \cos y & 0 \\ \sin x \cos y + \cos x \sin y & -\sin x \sin y + \cos x \cos y & 0 \\ 0 & 0 & 1\end{bmatrix}$

$= \begin{bmatrix}\cos(x+y) & -\sin(x+y) & 0 \\ \sin(x+y) & \cos(x+y) & 0 \\ 0 & 0 & 1\end{bmatrix} = F(x+y)$  **इति सिद्धम्**

---

**प्र. 45**  `[2020 · 4 अंक]`

⚠ **Board ka jaal:** व्युत्क्रम की पुष्टि में $AB = I$ **और** $BA = I$ दोनों दिखाइए; एक ओर का गुणनफल अधूरा सत्यापन है।
🧮 **Calculation me galti:** परिवर्त में केवल स्थान बदलते हैं, चिह्न या मान नहीं; करणी-अवयव ज्यों-के-त्यों रहते हैं।

प्रारम्भिक संक्रियाओं के प्रयोग से
$A=\begin{bmatrix}0&1&2\\1&2&3\\3&1&1\end{bmatrix}$ का व्युत्क्रम प्राप्त कीजिए।

**उत्तर:** दिया है,

    A′ = $\begin{bmatrix}-2 & 3 \\ 1 & 2\end{bmatrix}$  ⇒  A = $\begin{bmatrix}-2 & 1 \\ 3 & 2\end{bmatrix}$

अब

    (A + 2B) = $\begin{bmatrix}-2 & 1 \\ 3 & 2\end{bmatrix}$ + 2 $\begin{bmatrix}-1 & 0 \\ 1 & 2\end{bmatrix}$

             = $\begin{bmatrix}-2 & 1 \\ 3 & 2\end{bmatrix}$ + [ $- 2$  0 ; 2  4 ] = [ $- 4$  1 ; 5  6 ]

    (A + 2B)$'$ = [ $- 4$  5 ; 1  6 ] .

---

**प्र. 46**  `[2020 · 5 अंक]`

यदि $A=\begin{bmatrix} \cos\theta & \sin\theta \\ -\sin\theta & \cos\theta \end{bmatrix}$, तो सिद्ध कीजिए कि
$A^{n}=\begin{bmatrix} \cos n\theta & \sin n\theta \\ -\sin n\theta & \cos n\theta \end{bmatrix}$,
जहाँ $n\in N$.

**उत्तर:** दिया है, $A = \begin{bmatrix} \cos\alpha & \sin\alpha \\ -\sin\alpha & \cos\alpha \end{bmatrix}$
अब, $A^2 = A \times A = \begin{bmatrix} \cos\alpha & \sin\alpha \\ -\sin\alpha & \cos\alpha \end{bmatrix} \times \begin{bmatrix} \cos\alpha & \sin\alpha \\ -\sin\alpha & \cos\alpha \end{bmatrix}$ -----------**[½ अंक]**
$= \begin{bmatrix} \cos\alpha \cdot \cos\alpha + \sin\alpha(-\sin\alpha) & \cos\alpha \cdot \sin\alpha + \sin\alpha \cdot \cos\alpha \\ -\sin\alpha \cdot \cos\alpha - \cos\alpha \cdot \sin\alpha & -\sin\alpha \cdot \sin\alpha + \cos\alpha \cdot \cos\alpha \end{bmatrix}$
$= \begin{bmatrix} \cos^2\alpha - \sin^2\alpha & 2\sin\alpha \cos\alpha \\ -2\sin\alpha \cos\alpha & -\sin^2\alpha + \cos^2\alpha \end{bmatrix}$
$= \begin{bmatrix} \cos 2\alpha & \sin 2\alpha \\ -\sin 2\alpha & \cos 2\alpha \end{bmatrix}$ $[\because \sin 2\theta = 2\sin\theta \cos\theta$ तथा $\cos 2\theta = \cos^2\theta - \sin^2\theta]$ -----------**[½ अंक]**
**इति सिद्धम्**

---

**प्र. 47**  `[2020 · 5 अंक]`

⚠ **Board ka jaal:** $-40I$ में 40 केवल विकर्ण पर आता है, हर अवयव पर नहीं; इसे अनदेखा करना पूरे उत्तर को बिगाड़ देता है।

यदि $A=\begin{bmatrix}1&2&3\\3&-2&1\\4&2&1\end{bmatrix}$ है, तो दिखाइए कि $A^{3}-23A-40I=0$।
$5x+3y\leq 15$, $2x+5y\leq 10$ तथा $x\geq 0$, $y\geq 0$, $Z=10x+3y$ का अधिकतम मान ज्ञात कीजिए।
$\vec{(a+b)}\cdot[\vec{(b+c)}\times\vec{(c+a)}]=2[\vec{abc}]$।

**उत्तर:** $A^{2} = A\cdot A = \begin{bmatrix}19 & 4 & 8 \\ 1 & 12 & 8 \\ 14 & 6 & 15\end{bmatrix}$

$A^{3} = A\cdot A^{2} = \begin{bmatrix}63 & 46 & 69 \\ 69 & -6 & 23 \\ 92 & 46 & 63\end{bmatrix}$

$\therefore A^{3} - 23A - 40I = \begin{bmatrix}63 - 23 - 40 & 46 - 46 & 69 - 69 \\ 69 - 69 & -6 + 46 - 40 & 23 - 23 \\ 92 - 92 & 46 - 46 & 63 - 23 - 40\end{bmatrix} = \begin{bmatrix}0 & 0 & 0 \\ 0 & 0 & 0 \\ 0 & 0 & 0\end{bmatrix} = O$  **इति सिद्धम्**

---

## 2019

**प्र. 48**  `[2019 · 5 अंक]`

🧮 **Calculation me galti:** परिवर्त में केवल स्थान बदलते हैं, चिह्न या मान नहीं; करणी-अवयव ज्यों-के-त्यों रहते हैं।

यदि $A = \begin{bmatrix} -2 \\ 4 \\ 5 \end{bmatrix}$ तथा $B = [1 \; 3 \; -6]$ है, तो सत्यापित कीजिए $(AB)' = B'A'$

**उत्तर:** दिया है, $A = \begin{bmatrix} -2 \\ 4 \\ 5 \end{bmatrix}$, $B = [1 \; 3 \; -6]$
$AB = \begin{bmatrix} -2 \\ 4 \\ 5 \end{bmatrix}[1 \; 3 \; -6] = \begin{bmatrix} -2 & -6 & 12 \\ 4 & 12 & -24 \\ 5 & 15 & -30 \end{bmatrix}$ -----------**[1 अंक]**
$(AB)' = \begin{bmatrix} -2 & -6 & 12 \\ 4 & 12 & -24 \\ 5 & 15 & -30 \end{bmatrix}' = \begin{bmatrix} -2 & 4 & 5 \\ -6 & 12 & 15 \\ 12 & -24 & -30 \end{bmatrix}$ …(i) -----------**[2 अंक]**
तथा $B'A' = [1 \; 3 \; -6]'\begin{bmatrix} -2 \\ 4 \\ 5 \end{bmatrix}' = \begin{bmatrix} 1 \\ 3 \\ -6 \end{bmatrix}[-2 \; 4 \; 5]$
$B'A' = \begin{bmatrix} -2 & 4 & 5 \\ -6 & 12 & 15 \\ 12 & -24 & -30 \end{bmatrix}$ …(ii)
समी (i) व (ii) से, $(AB)' = B'A'$ -----------**[2 अंक]**

---

## महत्वपूर्ण प्रश्न

ये 8 प्रश्न 2019 से पहले के वर्षों के हैं, वर्ष-खिड़की के बाहर, पर पुस्तक
इन्हें आज भी छापती है, इसलिए यहाँ रखे गए हैं। हर प्रश्न के आगे उसका वर्ष लिखा है।

**प्र. 49**  `[2014 · 1 अंक]`

$x$ तथा $y$ के मान क्या होंगे, यदि $\begin{bmatrix} x & y \\ 3y & x \end{bmatrix}\begin{bmatrix} 1 \\ 2 \end{bmatrix} = \begin{bmatrix} 3 \\ 5 \end{bmatrix}$ हो?

**उत्तर:** दिया है, $\begin{bmatrix} x & y \\ 3y & x \end{bmatrix}\begin{bmatrix} 1 \\ 2 \end{bmatrix} = \begin{bmatrix} 3 \\ 5 \end{bmatrix}$
बाएँ पक्ष के आव्यूहों की गुणा करने पर,
$\begin{bmatrix} x \cdot 1 + 2 \cdot y \\ 3y \cdot 1 + 2 \cdot x \end{bmatrix} = \begin{bmatrix} 3 \\ 5 \end{bmatrix} \Rightarrow \begin{bmatrix} x + 2y \\ 3y + 2x \end{bmatrix} = \begin{bmatrix} 3 \\ 5 \end{bmatrix}$
अब, संगत अवयवों की तुलना करने पर,
$x + 2y = 3$ …(i)
तथा $3y + 2x = 5$ …(ii)
समी (i) में 2 से गुणा करके प्राप्त समीकरण में से समी (ii) को घटाने पर,
$2x + 4y = 6$
$\underline{2x + 3y = 5}$
$y = 1$
$y$ का मान समी (i) में रखने पर, $x + 2 = 3 \Rightarrow x = 1$
अतः $x$ तथा $y$ के मान क्रमशः 1 तथा 1 हैं।

---

**प्र. 50**  `[2018 · 1 अंक]`

यदि $A = \begin{bmatrix} 2 + i & -i \\ 3 & 4i \end{bmatrix}$ तथा $B = \begin{bmatrix} 1 + i & 2i \\ 2i & 3 \end{bmatrix}$ हो, तो $A + B$ का मान बताइए।

**उत्तर:** दिया है, $A = \begin{bmatrix} 2 + i & -i \\ 3 & 4i \end{bmatrix}$ तथा $B = \begin{bmatrix} 1 + i & 2i \\ 2i & 3 \end{bmatrix}$
$A + B = \begin{bmatrix} 2 + i & -i \\ 3 & 4i \end{bmatrix} + \begin{bmatrix} 1 + i & 2i \\ 2i & 3 \end{bmatrix}$ -----------**[½ अंक]**
$= \begin{bmatrix} 2 + i + 1 + i & -i + 2i \\ 3 + 2i & 4i + 3 \end{bmatrix}$
$\Rightarrow A + B = \begin{bmatrix} 3 + 2i & i \\ 3 + 2i & 4i + 3 \end{bmatrix}$ -----------**[½ अंक]**

---

**प्र. 51**  `[2016 · 1 अंक]`

यदि $A = \begin{bmatrix} 4 & 2 & 13 \\ 0 & 5 & 7 \\ 6 & 8 & 9 \end{bmatrix}$ तथा $B = \begin{bmatrix} 2 & 0 & 3 \\ 3 & 10 & 5 \\ 5 & 7 & 0 \end{bmatrix}$ हो, तो $3A - 2B$ का मान ज्ञात कीजिए।

**उत्तर:** $3A = \begin{bmatrix}12 & 6 & 39 \\ 0 & 15 & 21 \\ 18 & 24 & 27\end{bmatrix}$,  $2B = \begin{bmatrix}4 & 0 & 6 \\ 6 & 20 & 10 \\ 10 & 14 & 0\end{bmatrix}$

$\therefore 3A - 2B = \begin{bmatrix}12-4 & 6-0 & 39-6 \\ 0-6 & 15-20 & 21-10 \\ 18-10 & 24-14 & 27-0\end{bmatrix} = \begin{bmatrix}8 & 6 & 33 \\ -6 & -5 & 11 \\ 8 & 10 & 27\end{bmatrix}$

---

**प्र. 52**  `[2018 · 1 अंक]`

🧮 **Calculation me galti:** $2X$ से $X$ पाने के लिए $\tfrac{1}{2}$ से गुणा करना न भूलिए।

यदि $X + Y = \begin{bmatrix} 2 & 1 \\ 1 & 2 \end{bmatrix}$ तथा $2X - Y = \begin{bmatrix} 1 & 2 \\ 2 & 1 \end{bmatrix}$, तो $X$ का मान ज्ञात कीजिए।

**उत्तर:** दिया है, $X + Y = \begin{bmatrix} 2 & 1 \\ 1 & 2 \end{bmatrix}$ …(i)
तथा $2X - Y = \begin{bmatrix} 1 & 2 \\ 2 & 1 \end{bmatrix}$ …(ii)
दोनों समीकरणों को जोड़ने पर,
$X + Y + 2X - Y = \begin{bmatrix} 2 & 1 \\ 1 & 2 \end{bmatrix} + \begin{bmatrix} 1 & 2 \\ 2 & 1 \end{bmatrix}$
$\Rightarrow 3X = \begin{bmatrix} 2 + 1 & 1 + 2 \\ 1 + 2 & 2 + 1 \end{bmatrix}$
$\Rightarrow 3X = \begin{bmatrix} 3 & 3 \\ 3 & 3 \end{bmatrix} \Rightarrow X = \frac{1}{3}\begin{bmatrix} 3 & 3 \\ 3 & 3 \end{bmatrix} \Rightarrow X = \begin{bmatrix} 1 & 1 \\ 1 & 1 \end{bmatrix}$ -----------**[1 अंक]** [3 से भाग करने पर]

<!-- page 04 (book p.24) -->

---

**प्र. 53**  `[2018 · 2 अंक]`

यदि $A = \begin{bmatrix} 1 & -1 \\ -1 & 1 \end{bmatrix}$, तो सिद्ध कीजिए कि $A^3 = 4A$

**उत्तर:** दिया है, $A = \begin{bmatrix} 1 & -1 \\ -1 & 1 \end{bmatrix}$
$\therefore A^2 = A \cdot A = \begin{bmatrix} 1 & -1 \\ -1 & 1 \end{bmatrix}\begin{bmatrix} 1 & -1 \\ -1 & 1 \end{bmatrix} = \begin{bmatrix} 1 + 1 & -1 - 1 \\ -1 - 1 & 1 + 1 \end{bmatrix}$
$= \begin{bmatrix} 2 & -2 \\ -2 & 2 \end{bmatrix}$ -----------**[1 अंक]**
अब, $A^3 = A^2 \cdot A = \begin{bmatrix} 2 & -2 \\ -2 & 2 \end{bmatrix}\begin{bmatrix} 1 & -1 \\ -1 & 1 \end{bmatrix} = \begin{bmatrix} 2 + 2 & -2 - 2 \\ -2 - 2 & 2 + 2 \end{bmatrix}$
$= \begin{bmatrix} 4 & -4 \\ -4 & 4 \end{bmatrix} = 4\begin{bmatrix} 1 & -1 \\ -1 & 1 \end{bmatrix} = 4A$ **इति सिद्धम्** -----------**[1 अंक]**

---

**प्र. 54**  `[2014 · 2 अंक]`

यदि $A = \begin{bmatrix} 1 & 0 \\ 1 & 1 \end{bmatrix}$, $B = \begin{bmatrix} 2 & 0 \\ 1 & 1 \end{bmatrix}$ तथा $C = \begin{bmatrix} -1 & 2 \\ 3 & 1 \end{bmatrix}$ तो सिद्ध कीजिए $A(B + C) = AB + AC$

**उत्तर:** दिया है, $A = \begin{bmatrix} 1 & 0 \\ 1 & 1 \end{bmatrix}$, $B = \begin{bmatrix} 2 & 0 \\ 1 & 1 \end{bmatrix}$ तथा $C = \begin{bmatrix} -1 & 2 \\ 3 & 1 \end{bmatrix}$
अब, $B + C = \begin{bmatrix} 2 & 0 \\ 1 & 1 \end{bmatrix} + \begin{bmatrix} -1 & 2 \\ 3 & 1 \end{bmatrix} = \begin{bmatrix} 2 - 1 & 0 + 2 \\ 1 + 3 & 1 + 1 \end{bmatrix} = \begin{bmatrix} 1 & 2 \\ 4 & 2 \end{bmatrix}$
बायाँ पक्ष $= A(B + C) = \begin{bmatrix} 1 & 0 \\ 1 & 1 \end{bmatrix}\begin{bmatrix} 1 & 2 \\ 4 & 2 \end{bmatrix}$
$= \begin{bmatrix} 1 \times 1 + 0 \times 4 & 1 \times 2 + 0 \times 2 \\ 1 \times 1 + 1 \times 4 & 1 \times 2 + 1 \times 2 \end{bmatrix} = \begin{bmatrix} 1 & 2 \\ 5 & 4 \end{bmatrix}$ …(i)
अब, $AB = \begin{bmatrix} 1 & 0 \\ 1 & 1 \end{bmatrix}\begin{bmatrix} 2 & 0 \\ 1 & 1 \end{bmatrix} = \begin{bmatrix} 1 \times 2 + 0 \times 1 & 1 \times 0 + 0 \times 1 \\ 1 \times 2 + 1 \times 1 & 1 \times 0 + 1 \times 1 \end{bmatrix} = \begin{bmatrix} 2 & 0 \\ 3 & 1 \end{bmatrix}$ -----------**[1 अंक]**
तथा $AC = \begin{bmatrix} 1 & 0 \\ 1 & 1 \end{bmatrix}\begin{bmatrix} -1 & 2 \\ 3 & 1 \end{bmatrix} = \begin{bmatrix} 1 \times (-1) + 0 \times 3 & 1 \times 2 + 0 \times 1 \\ 1 \times (-1) + 1 \times 3 & 1 \times 2 + 1 \times 1 \end{bmatrix} = \begin{bmatrix} -1 & 2 \\ 2 & 3 \end{bmatrix}$
दायाँ पक्ष $= AB + AC = \begin{bmatrix} 2 & 0 \\ 3 & 1 \end{bmatrix} + \begin{bmatrix} -1 & 2 \\ 2 & 3 \end{bmatrix} = \begin{bmatrix} 2 - 1 & 0 + 2 \\ 3 + 2 & 1 + 3 \end{bmatrix} = \begin{bmatrix} 1 & 2 \\ 5 & 4 \end{bmatrix}$ …(ii)
समी (i) व (ii) से, बायाँ पक्ष $=$ दायाँ पक्ष
$\Rightarrow A(B + C) = AB + AC$ **इति सिद्धम्** -----------**[1 अंक]**

---

**प्र. 55**  `[2016 · 2 अंक]`

⚠ **Board ka jaal:** गुणन में क्रम मायने रखता है ($AB \ne BA$); क्रम बदलकर हल करना ग़लत निकाय देता है।

यदि $A = \begin{bmatrix} 1 & 2 & 5 \\ 3 & 4 & 6 \end{bmatrix}$ तथा $B = \begin{bmatrix} 4 & 0 \\ 2 & 1 \\ 3 & 2 \end{bmatrix}$ है, तो सिद्ध कीजिए कि $AB \ne BA$

**उत्तर:**

बायाँ पक्ष = [5 $- 1$; 6 7][2 1; 3 4]

= [$10 - 3$  $5 - 4$; 12+21  6+28] = [7 1; 33 34]  ← पंक्ति $\times$ स्तम्भ गुणनफल

दायाँ पक्ष = [2 1; 3 4][5 $- 1$; 6 7]

= [10+6  $- 2+7$; 15+24  $- 3+28$] = [16 5; 39 25]  ← पंक्ति $\times$ स्तम्भ गुणनफल

बायाँ पक्ष $\ne$ दायाँ पक्ष  इति सिद्धम्

---

**प्र. 56**  `[2018 · 2 अंक]`

🧮 **Calculation me galti:** परिवर्त में केवल स्थान बदलते हैं, चिह्न या मान नहीं; करणी-अवयव ज्यों-के-त्यों रहते हैं।

$A$ तथा $B$ आव्यूहों के लिए सत्यापित कीजिए कि $(AB)' = B'A'$, जहाँ $A = \begin{bmatrix} 1 \\ -4 \\ 3 \end{bmatrix}$ तथा $B = [-1 \; 2 \; 1]$

**उत्तर:** यहाँ, $AB = \begin{bmatrix} 1 \\ -4 \\ 3 \end{bmatrix}[-1 \; 2 \; 1] = \begin{bmatrix} -1 & 2 & 1 \\ 4 & -8 & -4 \\ -3 & 6 & 3 \end{bmatrix}$
$(AB)' = \begin{bmatrix} -1 & 2 & 1 \\ 4 & -8 & -4 \\ -3 & 6 & 3 \end{bmatrix}' = \begin{bmatrix} -1 & 4 & -3 \\ 2 & -8 & 6 \\ 1 & -4 & 3 \end{bmatrix}$ …(i) -----------**[1 अंक]**
तथा $B'A' = [-1 \; 2 \; 1]'\begin{bmatrix} 1 \\ -4 \\ 3 \end{bmatrix}' = \begin{bmatrix} -1 \\ 2 \\ 1 \end{bmatrix}[1 \; -4 \; 3]$
$= \begin{bmatrix} -1 & 4 & -3 \\ 2 & -8 & 6 \\ 1 & -4 & 3 \end{bmatrix}$ …(ii)
समी (i) तथा (ii) से, $(AB)' = B'A'$ -----------**[1 अंक]**

---
