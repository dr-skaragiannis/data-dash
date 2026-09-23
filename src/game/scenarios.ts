// Data-Dash assessment scenarios: branching "read the situation" mini-cases.
// Not a quiz — the player reads a real social-engineering exchange and picks
// what they would actually do/say. Outcomes: great (appropriate), cautious
// (sloppy but survived), fail (vulnerable).
export type ScnCat = 'phish' | 'privacy' | 'biometric' | 'network' | 'bully' | 'auth'

export interface ScnOption {
  text: string
  kind: 'safe' | 'cautious' | 'fail' | 'neutral'
  end?: boolean
}
export interface ScnStage {
  speaker: string
  text: string
  options: ScnOption[] // empty for the final reveal stage
}
export interface Scenario {
  id: string
  cats: ScnCat[]
  lang: 'en' | 'gr'
  title: string
  risk: string
  goal: string
  stages: ScnStage[]
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'megamart',
    cats: ['phish'],
    lang: 'en',
    title: 'The Retailer "Loyalty" Card',
    risk: 'Corporate data harvesting / consumer profiling',
    goal: 'Data minimization: never trade habits and PII for a trivial discount.',
    stages: [
      {
        speaker: 'MegaMart Rewards',
        text: 'Thanks for shopping! Tap here to join our FREE VIP tier and save 5% on your next purchase: www.megamart-rewards.com/signup',
        options: [
          { text: '5% off sounds nice. Let me see what information they need.', kind: 'neutral' },
          { text: 'I am NOT trading my whole grocery history for a 5% coupon. Ignoring this.', kind: 'safe', end: true },
        ],
      },
      {
        speaker: 'MegaMart Rewards',
        text: 'To set up your digital passport, please provide your FULL NAME, DATE OF BIRTH and HOME ADDRESS so we can mail your rewards card.',
        options: [
          { text: 'Why do they need my exact birthday and home address for a grocery discount?', kind: 'neutral' },
          { text: 'Seems standard for a loyalty card. Entering my details.', kind: 'fail' },
        ],
      },
      {
        speaker: 'MegaMart Rewards',
        text: 'We use your birthday to send a FREE annual cookie voucher! Complete all fields to unlock the digital application.',
        options: [
          { text: 'No thanks. Trading my PII and home address for a cookie is a bad privacy deal.', kind: 'safe', end: true },
          { text: 'Alright, I will fill it in for the birthday reward.', kind: 'neutral' },
        ],
      },
      {
        speaker: 'MegaMart Rewards',
        text: 'Optional: link your social media profiles to earn 50 EXTRA bonus points today!',
        options: [
          { text: 'Linking social lets them cross-reference my real identity with my online data. No way.', kind: 'cautious', end: true },
          { text: 'More points! Linking my account now.', kind: 'neutral' },
        ],
      },
      {
        speaker: 'MegaMart Rewards',
        text: 'Profile complete. Your purchasing habits and identity graph are now permanently synced.',
        options: [],
      },
    ],
  },
  {
    id: 'sam',
    cats: ['privacy', 'bully'],
    lang: 'en',
    title: 'The "Casual Friend" Background Check',
    risk: 'Personal boundaries / digital footprint exploitation',
    goal: 'Never let an acquaintance map your private life, your past or your family.',
    stages: [
      {
        speaker: 'Sam (Acquaintance)',
        text: 'Hey! I was trying to find your old posts online but couldnt. What was your old username, or the city you lived in before moving? Looking up those college photos you mentioned!',
        options: [
          { text: 'Oh, my old handle was @User99 and I lived in Boston.', kind: 'neutral' },
          { text: 'I deliberately locked my old accounts to keep my past private. Sorry!', kind: 'safe', end: true },
        ],
      },
      {
        speaker: 'Sam',
        text: 'Found the profile but it is private! What was the name of that student club or dorm you stayed in? I want to see if we have mutual friends there.',
        options: [
          { text: 'Why are you digging so deep into my background? It feels a bit intrusive.', kind: 'neutral' },
          { text: 'It was Eliot House. Let me know if you find anyone we know!', kind: 'fail' },
        ],
      },
      {
        speaker: 'Sam',
        text: 'Haha I am not digging, just curious! Do not be so secretive. Just accept my follow request on that old account so I can browse.',
        options: [
          { text: 'I keep my private life private for a reason. No requests on old accounts.', kind: 'safe', end: true },
          { text: 'I guess if it is just you, it is fine. Approving the request.', kind: 'neutral' },
        ],
      },
      {
        speaker: 'Sam',
        text: 'Wow, you used to post a lot about your family! Who is that cousin you tagged in all those photos from 2018? What is her deal?',
        options: [
          { text: 'This is getting uncomfortable. You are overstepping my privacy boundaries.', kind: 'cautious', end: true },
          { text: 'Oh, that is Sarah. She lives out west now.', kind: 'neutral' },
        ],
      },
      {
        speaker: 'Sam',
        text: 'Cool, found her profile too. Interesting family dynamic!',
        options: [],
      },
    ],
  },
  {
    id: 'popfilter',
    cats: ['biometric'],
    lang: 'en',
    title: 'The "Free" Photo Editor',
    risk: 'Biometric data harvesting / face modeling',
    goal: 'Your face is unique biological data — never trade it for a novelty filter.',
    stages: [
      {
        speaker: 'PopFilter App',
        text: 'Turn yourself into a 1920s movie star! Download our FREE editor and upload a clear selfie to see your retro transformation: www.popfilter-retro.net/start',
        options: [
          { text: 'This looks trendy, let me see how the filter looks.', kind: 'neutral' },
          { text: 'Free facial apps usually harvest biometric data for AI training. Skipping this trend.', kind: 'safe', end: true },
        ],
      },
      {
        speaker: 'PopFilter App',
        text: 'To process the filter, please grant the app PERMANENT permission to store your facial map coordinates in our cloud network.',
        options: [
          { text: 'Permanent storage of my face map? Why would they need to keep my biometric data?', kind: 'neutral' },
          { text: 'It needs my face to make the filter work, right? Click accept.', kind: 'fail' },
        ],
      },
      {
        speaker: 'PopFilter App',
        text: 'Cloud storage ensures faster rendering! If you deny this, we cannot generate your retro avatar image.',
        options: [
          { text: 'I am not trading my unique biological data and face scan for a photo filter.', kind: 'safe', end: true },
          { text: 'I really want to see the image. Okay, process it.', kind: 'neutral' },
        ],
      },
      {
        speaker: 'PopFilter App',
        text: 'Processing... Check this box to also allow our PARTNER AD NETWORKS to use your likeness data for personalized marketing tests.',
        options: [
          { text: 'Selling my face to advertisers? Unchecking that box immediately.', kind: 'cautious', end: true },
          { text: 'I just want the picture, leave it checked.', kind: 'neutral' },
        ],
      },
      {
        speaker: 'PopFilter App',
        text: 'Avatar generated! Thank you for donating your biometric profile to our data ecosystem.',
        options: [],
      },
    ],
  },
  {
    id: 'smarttv',
    cats: ['network'],
    lang: 'en',
    title: 'The Smart TV "Viewing Analytics" Opt-In',
    risk: 'Domestic behavioral tracking / ACR surveillance',
    goal: 'Protect your home life and media habits from being logged and sold.',
    stages: [
      {
        speaker: 'TV Setup Assistant',
        text: 'Welcome to your new Smart TV! Enable Automatic Content Recognition (ACR) to receive smart programming recommendations.',
        options: [
          { text: 'Recommendations are useful. Let us see how it works.', kind: 'neutral' },
          { text: 'ACR takes fingerprints of whatever is on my screen to track my habits. Disabling it completely.', kind: 'safe', end: true },
        ],
      },
      {
        speaker: 'TV Setup Assistant',
        text: 'ACR identifies everything you watch (cable, streaming, gaming) second-by-second to calibrate your home display profile.',
        options: [
          { text: 'Wait — it monitors my gaming consoles and private video playbacks too? That feels intrusive.', kind: 'neutral' },
          { text: 'Sounds highly advanced. Lets toggle it on.', kind: 'fail' },
        ],
      },
      {
        speaker: 'TV Setup Assistant',
        text: 'If disabled, your home recommendations menu will remain generic. Confirm ACR activation?',
        options: [
          { text: 'I prefer a generic menu over a corporate tracker watching my living room screen.', kind: 'safe', end: true },
          { text: 'I hate generic menus. Lets turn it on.', kind: 'neutral' },
        ],
      },
      {
        speaker: 'TV Setup Assistant',
        text: 'ACR active. Would you also like to link your household smart assistants to share viewing logs across all family mobile devices?',
        options: [
          { text: 'Cross-device spreading of the data trail is too far. Declining the link.', kind: 'cautious', end: true },
          { text: 'Yes, sync everything together.', kind: 'neutral' },
        ],
      },
      {
        speaker: 'TV Setup Assistant',
        text: 'Ecosystem linked. Your minute-by-minute domestic behavior profile is now broadcasting to data networks.',
        options: [],
      },
    ],
  },
  {
    id: 'transit',
    cats: ['network', 'phish'],
    lang: 'en',
    title: 'The "Free Wi-Fi" Browser Tracking',
    risk: 'Location & web-history data monetization',
    goal: 'Mask your browsing on open networks and reject overreaching tracking terms.',
    stages: [
      {
        speaker: 'Transit WiFi Portal',
        text: 'Welcome to Subway Free WiFi! Connect instantly by providing your email address and accepting our Terms of Service.',
        options: [
          { text: 'I need internet. Lets type in my email address.', kind: 'neutral' },
          { text: 'I will use a masked email to isolate my inbox from tracking identifiers.', kind: 'safe', end: true },
        ],
      },
      {
        speaker: 'Transit WiFi Portal',
        text: 'By clicking Connect, you consent to our network capturing your browser history logs, location history and device MAC address to serve regional ads.',
        options: [
          { text: 'Capturing my exact location and browsing logs? That goes way past just providing internet.', kind: 'neutral' },
          { text: 'Whatever, it is the only way to get free Wi-Fi. Click accept.', kind: 'fail' },
        ],
      },
      {
        speaker: 'Transit WiFi Portal',
        text: 'This tracking is standard for city infrastructure. If you refuse, internet access is restricted to 2 minutes total.',
        options: [
          { text: 'I will use my cellular network or a private VPN instead of surrendering my trail.', kind: 'safe', end: true },
          { text: 'I need to look up maps, I do not have a choice. Accept tracking.', kind: 'neutral' },
        ],
      },
      {
        speaker: 'Transit WiFi Portal',
        text: 'Connected! For a faster connection, download our transit-tracker companion app to automatically track your daily commute routes.',
        options: [
          { text: 'Auto-tracking my daily commutes? A privacy nightmare. Sticking to the basic web tier.', kind: 'cautious', end: true },
          { text: 'Sure, sounds helpful for travel tracking.', kind: 'neutral' },
        ],
      },
      {
        speaker: 'Transit WiFi Portal',
        text: 'App installed. Your daily commuter location patterns are now mapped, compiled and archived.',
        options: [],
      },
    ],
  },
  {
    id: 'quiz',
    cats: ['phish'],
    lang: 'gr',
    title: 'Το Viral Quiz στο Instagram / TikTok',
    risk: 'Εταιρικό φιλτράρισμα & ψυχολογικό προφίλ (data harvesting)',
    goal: 'Τα «αθώα» trends μαζεύουν πληροφορίες για tracking και στοχευμένες διαφημίσεις.',
    stages: [
      {
        speaker: 'Nick (Συμμαθητής, Viber)',
        text: 'Ρε συ, δες αυτό το link στο TikTok! Σου λέει ποιο character είσαι, ανάλογα με το ζώδιο, το σχολείο σου και το όνομα του πρώτου σου crush! Ανέβασέ το story!',
        options: [
          { text: 'Φάση έχει, ας το κάνω να δω τι θα μου βγάλει.', kind: 'neutral' },
          { text: 'Σιγά μην γράψω σε μια άγνωστη εφαρμογή το σχολείο μου και προσωπικά μου στοιχεία για ένα trend.', kind: 'safe', end: true },
        ],
      },
      {
        speaker: 'Nick',
        text: 'Έλα ρε, όλο το τμήμα το έχει κάνει! Για να σου βγάλει αποτέλεσμα απλά σου ζητάει να συνδεθείς με το Insta για να τραβήξει τη λίστα των φίλων σου.',
        options: [
          { text: 'Γιατί να θέλει πρόσβαση στους φίλους μου για ένα quiz; Ύποπτο.', kind: 'neutral' },
          { text: 'Εντάξει, πατάω «Σύνδεση μέσω Instagram».', kind: 'fail' },
        ],
      },
      {
        speaker: 'Nick',
        text: 'Για να σου στείλει το custom βίντεο λέει, όχι για κακό. Αν δεν το πατήσεις, δεν σου δείχνει το αποτέλεσμα.',
        options: [
          { text: 'Δεν δίνω πρόσβαση στο προφίλ μου και στους φίλους μου σε μια άγνωστη εταιρεία.', kind: 'safe', end: true },
          { text: 'Καλά, το πατάω μόνο για να δω το character.', kind: 'neutral' },
        ],
      },
      {
        speaker: 'Nick',
        text: 'Μου βγήκε και ένα κουτάκι «Αποδοχή για προώθηση διαφημίσεων από συνεργάτες». Το τσέκαρα κι εγώ για να τελειώνω.',
        options: [
          { text: 'Θα γεμίσει το feed μου με σπαμ και θα πουλήσουν τα δεδομένα μου. Το ξετσεκάρω.', kind: 'cautious', end: true },
          { text: 'Το αφήνω τσεκαρισμένο, σιγά.', kind: 'neutral' },
        ],
      },
      {
        speaker: 'Nick',
        text: 'Τέλεια, μου βγήκε το αποτέλεσμα! Αλλά τώρα μου έρχονται συνέχεια άκυρα μηνύματα και διαφημίσεις...',
        options: [],
      },
    ],
  },
  {
    id: 'liveloc',
    cats: ['network', 'privacy'],
    lang: 'gr',
    title: 'Το «Κατά Λάθος» Live Location',
    risk: 'Παραβίαση φυσικής ιδιωτικότητας / παρακολούθηση (stalking)',
    goal: 'Προστασία της τοποθεσίας σου: πού συχνάζεις και πού είναι το σπίτι σου.',
    stages: [
      {
        speaker: 'Unknown_User (Instagram)',
        text: 'Hey! Είδα το BeReal σου, είμαστε στο ίδιο εμπορικό τώρα! Στείλε ένα live location link στο Viber να βρεθούμε για καφέ;',
        options: [
          { text: 'Α, σοβαρά; Περίμενε να σου στείλω την τοποθεσία μου.', kind: 'neutral' },
          { text: 'Δεν στέλνω την τοποθεσία μου σε άτομα που δεν ξέρω από κοντά. Άκυρο.', kind: 'safe', end: true },
        ],
      },
      {
        speaker: 'Unknown_User',
        text: 'Έλα ρε, μην κολλάς, συμμαθητής του Χρήστου από το διπλανό λύκειο είμαι! Απλά πάτα στο Viber «Κοινοποίηση τοποθεσίας για 1 ώρα» να σε βρω στα γρήγορα.',
        options: [
          { text: 'Αν είσαι εδώ, πες μου σε ποιο μαγαζί είσαι εσύ. Δεν θέλω να με παρακολουθείς live.', kind: 'neutral' },
          { text: 'Α, αφού είσαι φίλος του Χρήστου, ορίστε το link.', kind: 'fail' },
        ],
      },
      {
        speaker: 'Unknown_User',
        text: 'Είμαι κοντά στα Village, αλλά κινούμαι. Γιατί κρύβεσαι; Ένα map pin είναι, σιγά το πράγμα.',
        options: [
          { text: 'Δεν μοιράζομαι τη live διαδρομή μου με κανέναν. Αν θες, ραντεβού έξω από τα Village.', kind: 'safe', end: true },
          { text: 'Καλά, σου στέλνω μια απλή τοποθεσία (static pin) τότε, όχι live.', kind: 'neutral' },
        ],
      },
      {
        speaker: 'Unknown_User',
        text: 'Το σταθερό pin δεν με βοηθάει, στείλε το live ή άνοιξε το «Ghost Mode» στο Snapchat να σε δω στο Snap Map.',
        options: [
          { text: 'Το Snap Map μου είναι μόνιμα κλειστό για λόγους ιδιωτικότητας. Δεν το ανοίγω.', kind: 'cautious', end: true },
          { text: 'Εντάξει, ανοίγω τον χάρτη στο Snap για 5 λεπτά.', kind: 'neutral' },
        ],
      },
      {
        speaker: 'Unknown_User',
        text: 'Σε είδα στον χάρτη! Θα ξέρω και πώς να σε βρίσκω και τις άλλες μέρες μετά το σχολείο...',
        options: [],
      },
    ],
  },
  {
    id: 'faceanime',
    cats: ['biometric'],
    lang: 'gr',
    title: 'Η «Δωρεάν» Εφαρμογή Φίλτρων AI',
    risk: 'Συλλογή βιομετρικών χαρακτηριστικών (facial mapping)',
    goal: 'Το πρόσωπό σου είναι μοναδικό δεδομένο — δεν χαρίζεται σε AI εταιρείες.',
    stages: [
      {
        speaker: 'TikTok Ad',
        text: 'Γίνε anime χαρακτήρας με ένα κλικ! Κατέβασε το «FaceAnime AI» δωρεάν, ανέβασε 5 selfies σου και δες τον εαυτό σου στο επόμενο viral βίντεο!',
        options: [
          { text: 'Τέλειο φίλτρο, θα βγει πολύ καλό TikTok βίντεο. Το κατεβάζω.', kind: 'neutral' },
          { text: 'Αυτές οι δωρεάν AI εφαρμογές κρατάνε τα πρόσωπα των χρηστών στις βάσεις δεδομένων τους. Δεν θα το πάρω.', kind: 'safe', end: true },
        ],
      },
      {
        speaker: 'FaceAnime App',
        text: 'Για να δημιουργηθεί το avatar, αποδεχτείτε τους Όρους για τη «Μόνιμη Αποθήκευση και Επεξεργασία των Βιομετρικών Χαρακτηριστικών του Προσώπου σας» στο cloud μας.',
        options: [
          { text: 'Μόνιμη αποθήκευση; Γιατί να κρατήσουν το πρόσωπό μου για πάντα;', kind: 'neutral' },
          { text: 'Ε, κλασικοί όροι εφαρμογών, κανείς δεν τους διαβάζει. Πατάω «Αποδοχή».', kind: 'fail' },
        ],
      },
      {
        speaker: 'FaceAnime App',
        text: 'Η αποθήκευση είναι απαραίτητη για να βελτιώνεται το AI μας. Αν πατήσετε «Άρνηση», η εφαρμογή θα κλείσει.',
        options: [
          { text: 'Δεν χαρίζω τα βιομετρικά μου δεδομένα (το πρόσωπό μου) για ένα εφέ. Διαγραφή εφαρμογής.', kind: 'safe', end: true },
          { text: 'Θέλω πολύ να δω πώς είμαι σε anime, οπότε πατάω OK.', kind: 'neutral' },
        ],
      },
      {
        speaker: 'FaceAnime App',
        text: 'Το avatar είναι έτοιμο! Τσεκάρετε αν επιτρέπετε στην εταιρεία να χρησιμοποιήσει τη φωτογραφία σας σε μελλοντικές διαφημιστικές καμπάνιες.',
        options: [
          { text: 'Να βλέπω το πρόσωπό μου σε άκυρες διαφημίσεις στο ίντερνετ; Όχι, το ξετσεκάρω.', kind: 'cautious', end: true },
          { text: 'Δεν πειράζει, ας το αφήσω.', kind: 'neutral' },
        ],
      },
      {
        speaker: 'FaceAnime App',
        text: 'Σας ευχαριστούμε! Το πρόσωπό σας ανήκει πλέον στη βάση δεδομένων μας για εκπαίδευση deepfake και AI μοντέλων.',
        options: [],
      },
    ],
  },
  {
    id: 'viber',
    cats: ['bully', 'privacy'],
    lang: 'gr',
    title: 'Η Ομαδική στο Viber / WhatsApp',
    risk: 'Υπερέκθεση (oversharing) / διαρροή προσωπικών στιγμών',
    goal: 'Προστασία της ιδιωτικότητας σου και των φίλων σου από δημόσια έκθεση και bullying.',
    stages: [
      {
        speaker: 'Alex (Ομαδική «The Boys»)',
        text: 'Ρε, σβήσαμε στο μάθημα σήμερα! Δείτε αυτή τη φωτογραφία που έβγαλα κρυφά τον Γιώργο που τον είχε πάρει ο ύπνος στο θρανίο! Προωθήστε τη παντού να γελάσουμε!',
        options: [
          { text: 'Χαχαχα απίστευτη, τη στέλνω και στην άλλη ομαδική με τα παιδιά από το φροντιστήριο!', kind: 'neutral' },
          { text: 'Δεν είναι σωστό να βγάζεις φωτογραφία κάποιου χωρίς να το ξέρει και να τον εκθέτεις. Μην τη στείλεις παραέξω.', kind: 'safe', end: true },
        ],
      },
      {
        speaker: 'Alex',
        text: 'Έλα μωρέ, πλάκα κάνουμε. Βασικά, έβαλα κατά λάθος και δύο άτομα που δεν ξέρουμε καλά, αλλά σιγά, δεν θα την κάνουν screenshot.',
        options: [
          { text: 'Ώπα, αφού έχει άγνωστα άτομα στην ομαδική, κακώς ανέβηκε. Πρέπει να διαγραφεί.', kind: 'neutral' },
          { text: 'Δεν πειράζει, όλοι στην ίδια περιοχή μένουμε, ας τη δουν.', kind: 'fail' },
        ],
      },
      {
        speaker: 'Alex',
        text: 'Σιγά μην τη διαγράψω, ήδη έχουν βάλει όλοι reactions. Γιατί αγχώνεσαι έτσι;',
        options: [
          { text: 'Γιατί παραβιάζει την ιδιωτικότητα του Γιώργου. Αν δεν τη σβήσεις εσύ, θα του το πω εγώ να προσέχει τι ανεβαίνει εδώ μέσα.', kind: 'safe', end: true },
          { text: 'Εντάξει, απλά μην ανεβάζετε ποτέ δική μου έτσι.', kind: 'neutral' },
        ],
      },
      {
        speaker: 'Alex',
        text: 'Και τι έγινε; Εδώ ο ίδιος ο Γιώργος είχε ανεβάσει σε story το τηλέφωνο της αδερφής του τις προάλλες, για πλάκα.',
        options: [
          { text: 'Το ότι εκείνος δεν προσέχει την ιδιωτικότητα της οικογένειάς του, δεν σημαίνει ότι πρέπει να κάνουμε το ίδιο.', kind: 'cautious', end: true },
          { text: 'Ισχύει, άρα δεν τον νοιάζει.', kind: 'neutral' },
        ],
      },
      {
        speaker: 'Alex',
        text: 'Κάποιος από την ομαδική την έκανε download και την ανέβασε σε δημόσιο προφίλ. Τώρα ο Γιώργος έχει μπλέξει με bullying...',
        options: [],
      },
    ],
  },
  {
    id: 'exif',
    cats: ['network', 'privacy'],
    lang: 'gr',
    title: 'Τα «Κρυφά» Στοιχεία στις Φωτογραφίες (EXIF)',
    risk: 'Διαρροή κρυφών δεδομένων (GPS metadata leakage)',
    goal: 'Οι φωτογραφίες κρύβουν ακριβή θέση — στέλνε screenshot, όχι αρχεία.',
    stages: [
      {
        speaker: 'Gamer_X (Online φίλος, Discord)',
        text: 'Φίλε, πολύ ωραίο το PC setup που μου είπες ότι έφτιαξες στο δωμάτιό σου! Στείλε μου τη φωτογραφία σε αρχείο (Uncompressed) στο Discord για να τη δω σε καθαρή ανάλυση!',
        options: [
          { text: 'Ναι, αμέσως — τη στέλνω ως αρχείο για να μην χάσει καθόλου ποιότητα.', kind: 'neutral' },
          { text: 'Θα σου στείλω ένα απλό screenshot. Αν στείλω το πρωτότυπο αρχείο, περιέχει την τοποθεσία GPS του σπιτιού μου.', kind: 'safe', end: true },
        ],
      },
      {
        speaker: 'Gamer_X',
        text: 'Ναι, στείλε τη σαν έγγραφο (Document) οπωσδήποτε, γιατί το Discord μειώνει την ποιότητα των εικόνων και δεν φαίνονται οι λεπτομέρειες.',
        options: [
          { text: 'Κάτσε — αν τη στείλω σαν έγγραφο, οι ιδιότητες του αρχείου θα δείχνουν πού βγήκε η φωτογραφία;', kind: 'neutral' },
          { text: 'Σωστά. Ορίστε το αρχείο .jpg.', kind: 'fail' },
        ],
      },
      {
        speaker: 'Gamer_X',
        text: 'Έλα ρε, ποιος κάθεται να ψάχνει τα metadata των φωτογραφιών; Μια απλή εικόνα δωμάτιου είναι, σιγά μην βρω την οδό σου.',
        options: [
          { text: 'Κι όμως, είναι πανεύκολο. Δεν στέλνω αρχεία που τράβηξα μέσα από το σπίτι μου. Μόνο screenshot.', kind: 'safe', end: true },
          { text: 'Ελπίζω να μην ξέρεις πώς να το δεις. Την στέλνω.', kind: 'neutral' },
        ],
      },
      {
        speaker: 'Gamer_X',
        text: 'Ωραία, την κατεβάζω. Μου είχες πει ότι μένεις στα βόρεια προάστια γενικά, σωστά;',
        options: [
          { text: 'Ναι, αλλά μέχρι εκεί. Δεν θέλω να ξέρεις την ακριβή μου διεύθυνση.', kind: 'cautious', end: true },
          { text: 'Ναι, εκεί κοντά.', kind: 'neutral' },
        ],
      },
      {
        speaker: 'Gamer_X',
        text: 'Βασικά, άνοιξα τις ιδιότητες της εικόνας. Λέει ακριβείς συντεταγμένες GPS. Μένεις στον τρίτο όροφο της οδού Μιαούλη 14, έτσι;',
        options: [],
      },
    ],
  },
  {
    id: 'password',
    cats: ['auth'],
    lang: 'en',
    title: 'The Borrowed Password',
    risk: 'Password sharing / weak credentials & 2FA fatigue',
    goal: 'Unique random passwords + 2FA ON, always. Your code stays yours — even for teammates.',
    stages: [
      {
        speaker: 'Jake (Teammate)',
        text: 'My 2FA code is not coming in! Can you just lend me your account password to reset our shared drive? I will pay you in skins.',
        options: [
          { text: 'Sure — my password is blue123. There you go.', kind: 'fail' },
          { text: 'Passwords are never shared, even with teammates. I will ask the admin instead.', kind: 'safe', end: true },
        ],
      },
      {
        speaker: 'Jake',
        text: 'Okay okay — then just TYPE it in for me real quick while I am logged out. I will not tell a soul.',
        options: [
          { text: 'Eh, typing it once should not hurt...', kind: 'neutral' },
          { text: 'Not even that. Sending or typing your password anywhere else is a leak.', kind: 'safe', end: true },
        ],
      },
      {
        speaker: 'Jake',
        text: 'Fine! But set your password to 20150314 so we remember team day — and switch OFF the 2FA, it is so annoying.',
        options: [
          { text: 'Okay, our date as password, and 2FA off for easier login.', kind: 'neutral' },
          { text: 'No — dates and birthdays are the first things hackers guess. Unique password + 2FA stay ON.', kind: 'cautious', end: true },
        ],
      },
      {
        speaker: 'Jake',
        text: 'A week later: the shared drive is empty. Your "easy" account was taken over in seconds — and so was your profile.',
        options: [],
      },
    ],
  },
]

export function pickScenario(cat: ScnCat): Scenario {
  const pool = SCENARIOS.filter((s) => s.cats.includes(cat))
  return pool[Math.floor(Math.random() * pool.length)]
}
