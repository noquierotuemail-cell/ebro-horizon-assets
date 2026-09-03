(() => {
  const guide=window.HABRO_GUIDE_I18N;
  if(!guide)return;
  const sources=[...new Set(guide.translatedNodes.map(item=>item.pair.es))];
  const lines=value=>value.trim().split('\n');
  const translations={
    bg:lines(`Ръководство за инсталиране · преди да започнете
Визуално ръководство за инсталиране
Предстои да инсталирате HABRO.
Ето какво ще се случи.
Кратък преглед, за да знаете какво ще виждате на всеки екран, кога трябва да се намесите и кога можете просто да оставите HABRO да работи.
Вижте стъпките
Печат / запазване като PDF
Ако диалоговият прозорец за печат не се появи, този преглед блокира функцията на браузъра.
Отворете ръководството в нов раздел
и там използвайте
Споделяне → Печат
или
Запазване във „Файлове“ като PDF
Без YAML
Няма да се налага да редактирате файлове или да търсите обекти.
Без Terminal
Няма да се налага да въвеждате команди или да използвате SSH.
С възстановяване
Преди да направи промени, HABRO подготвя копие за възстановяване.
Процесът,
екран по екран.
Изображенията на интерфейса в това ръководство са създадени с HTML, за да обяснят процеса. Те не заменят реалните екрани на Home Assistant, но следват потока, който HABRO трябва да изпълни.
Начало
Отваряте HABRO и избирате „Инсталиране“.
Входната точка за потребителя е
. На началния екран ще видите логото на HABRO, приветствието и две възможности:
Вход
При първа инсталация натиснете
. HABRO ще ви обясни, че трябва да се свърже с вашия Home Assistant, за да продължи.
ВИЕ
Трябва да направите само едно:
да натиснете
какво искате да направите?
Упълномощаване
Home Assistant иска вашето разрешение.
HABRO ще ви отведе в Home Assistant. Ако нямате активна сесия, ще влезете в профила си. Home Assistant може да покаже административни потвърждения, за да се довери на хранилището и да инсталира HABRO Installer.
Тези потвърждения не са грешка: чрез тях Home Assistant иска разрешението ви, преди да позволи инсталацията.
Удостоверете се и приемете потвържденията,
които Home Assistant покаже.
Свързване с Home Assistant
Home Assistant ще потвърди, че разрешавате необходимия достъп за подготовката на HABRO.
Сигурна връзка
Упълномощаването се извършва в Home Assistant.
Административно потвърждение
Home Assistant може да поиска да приемете хранилището и инсталацията.
Продължаване в Home Assistant
Инсталирате HABRO Installer.
Home Assistant ще отвори точната страница на
. Не би трябвало да се налага да го търсите ръчно.
Докато Installer е в режим на ръчно стартиране, оставете
„Стартиране при зареждане“ изключено
. Предвиденият процес е:
Инсталиране → Стартиране → Отваряне на уеб интерфейса
Инсталирайте, стартирайте и отворете уеб интерфейса.
Не е необходимо да настройвате нищо техническо.
BRO е до вас:
„Стартиране при зареждане“ не инсталира HABRO самостоятелно. Оставете го изключено.
Приложение за Home Assistant, което подготвя HABRO.
ПЪРВО
СЛЕД ТОВА
Отваряне на уеб интерфейса
ПРОДЪЛЖАВАНЕ
„Стартиране при зареждане“ остава изключено.
HABRO проверява системата ви.
След като влезете в Installer, HABRO проверява съвместимостта, открива EBRO Auto и HABRO Companion, проверява пакетите и подготвя операцията.
Анализът е автоматичен. Ако системата вече е готова, няма да бъдат правени ненужни промени. Ако е необходимо инсталиране, актуализиране или поправка, HABRO ще подготви следващата стъпка.
Работи самостоятелно.
Вие само следите състоянието и изчаквате резултата от диагностиката.
Състояние на HABRO
Системата се проверява и се подготвя безопасна операция.
Home Assistant е свързан
Системата е съвместима
Пакетите са проверени
Местоназначението е проверено
Сигурност
Подготвя се копие за възстановяване.
Преди да промени активните компоненти, HABRO проверява пакетите и запазва необходимото състояние, за да може инсталацията да бъде възстановена, ако последната проверка е неуспешна.
След като ви покаже какво ще направи, HABRO иска
едно ясно потвърждение
за изпълнение на подготвената инсталация или поправка.
Прегледайте и потвърдете веднъж.
Промените не трябва да започват без вашето одобрение.
Всичко е готово
Пакетите, местоназначението и възстановяването са проверени.
Копието за възстановяване е готово
HABRO може да се върне към предишното състояние, ако последната проверка не е успешна.
Потвърждаване и инсталиране
Инсталиране
HABRO се инсталира и Home Assistant се рестартира.
След потвърждението ви HABRO прилага компонентите и Home Assistant се рестартира. За няколко минути екранът на Installer може да изчезне или Home Assistant все още да не е достъпен.
Не натискайте „Инсталиране“ отново.
Процесът запазва състоянието си и трябва да продължи от същия журнал, когато отворите HABRO Installer отново.
Изчаквате.
Ако екранът се затвори, върнете се в
Настройки → Приложения → HABRO Installer → Отваряне на уеб интерфейса
Това е моментът, който изисква най-много доверие:
рестартирането на Home Assistant е нормална част от процеса. Повторното отваряне на Installer възстановява напредъка и не повтаря инсталацията.
HABRO се инсталира…
Изтегляне и проверка
Завършено
Инсталиране на компоненти
Прилагане на конфигурацията
Рестартиране на Home Assistant
Може да отнеме няколко минути
Последна проверка
Предстои
Ако Home Assistant затвори този екран:
Настройки → Приложения → HABRO Installer → Отваряне на уеб интерфейса.
Свързвате своя EBRO профил.
Когато компонентите бъдат инсталирани, HABRO ще отвори
официалния config flow на EBRO
извън iframe прозореца на Installer.
Данните за вход в EBRO се въвеждат само там. Ако HABRO разпознае с достатъчна сигурност един автомобил, ще го избере автоматично; при неяснота ще ви попита.
Въвеждате данните си за вход в EBRO
и избирате автомобил само ако това наистина е необходимо.
Свързване на EBRO
Въвеждайте данните си единствено в официалния формуляр на Home Assistant.
Имейл / потребителско име в EBRO
Парола
Данните за вход в EBRO не се въвеждат в сайта на HABRO или в симулиран екран на Installer.
Виждате „HABRO е готов“.
Процесът приключва, когато
EBRO Auto и HABRO Companion са свързани и заредени
. Това състояние показва, че не остава техническа настройка.
Оттам можете да затворите HABRO Installer и да се върнете в приложението.
Ще го разберете недвусмислено:
„HABRO е готов“.
HABRO е готов.
EBRO Auto и HABRO Companion са свързани и заредени.
Не е необходимо да настройвате нищо друго. Вече можете да затворите HABRO Installer.
Ежедневен достъп
Добавяте HABRO към началния екран.
Когато HABRO е готов, можете да добавите PWA към началния екран и да го отваряте като приложение. В съвместимите браузъри ще се появи диалог за инсталиране; на iPhone/iPad ще видите как да използвате
Споделяне → Добавяне към началния екран → Добавяне
По желание:
добавяте HABRO към началния екран и след това го отваряте от иконата му.
Добавяне на HABRO към началния екран
На iPhone/iPad: Споделяне → Добавяне към началния екран → Добавяне.
Отваряне на HABRO
Вече можете да влезете в HABRO.
Отворете дистрибуционната версия на приложението, за да започнете процеса. Това ръководство ще остане тук, за да можете да се върнете към всяка стъпка и да попитате BRO, когато е необходимо.
Вход в HABRO
Ще се отвори app.habroremote.com
Какво да очаквате
Моментите, които може да изглеждат необичайни… са нормални.
Home Assistant иска няколко потвърждения.
Това е част от механизма за доверие при инсталиране на bootstrap.
Home Assistant се рестартира.
Екранът може да изчезне за няколко минути. Не повтаряйте инсталацията.
Трябва да се върнете в HABRO Installer.
Ако WebView се е затворил: Настройки → Приложения → HABRO Installer → Отваряне на уеб интерфейса.
Данните за вход в EBRO се появяват накрая.
Те се въвеждат единствено в официалния config flow на Home Assistant.
Краят е недвусмислен.
Процесът е завършен едва когато видите „HABRO е готов“.
Визуално ръководство за инсталиране · HABRO`),
    sl:lines(`Vodnik za namestitev · preden začnete
Vizualni vodnik za namestitev
Namestili boste HABRO.
Tako bo potekal postopek.
Kratek pregled, da boste vedeli, kaj boste videli na posameznem zaslonu, kdaj morate ukrepati in kdaj lahko preprosto pustite, da HABRO opravi svoje delo.
Oglejte si korake
Natisni / shrani kot PDF
Če se pogovorno okno za tiskanje ne prikaže, ta pregledovalnik blokira funkcijo brskalnika.
Odprite vodnik v novem zavihku
in tam izberite
Deli → Natisni
ali
Shrani v Datoteke kot PDF
Brez YAML-a
Ne bo vam treba urejati datotek ali iskati entitet.
Brez Terminala
Ne bo vam treba vnašati ukazov ali uporabljati SSH-ja.
Z možnostjo obnovitve
HABRO pred spremembami pripravi obnovitveno kopijo.
Postopek,
zaslon za zaslonom.
Prikazi vmesnika v tem vodniku so izdelani v HTML-ju, da pojasnijo postopek. Ne nadomeščajo dejanskih zaslonov Home Assistanta, vendar sledijo postopku, ki ga mora izvesti HABRO.
Začetek
Odprete HABRO in izberete »Namesti«.
Vstopna točka za uporabnika je
. Na začetnem zaslonu boste videli logotip HABRO, pozdrav in dve možnosti:
Prijava
Pri prvi namestitvi pritisnite
. HABRO vam bo pojasnil, da se mora za nadaljevanje povezati z vašim Home Assistantom.
VI
Narediti morate samo eno:
pritisniti
Kaj želite storiti?
Pooblastitev
Home Assistant vas prosi za dovoljenje.
HABRO vas bo preusmeril v Home Assistant. Če nimate odprte seje, se boste prijavili. Home Assistant lahko prikaže skrbniške potrditve, s katerimi odobrite repozitorij in namestitev HABRO Installerja.
Te potrditve niso napaka: tako Home Assistant pred namestitvijo pridobi vaše dovoljenje.
Prijavite se in sprejmite potrditve,
ki jih prikaže Home Assistant.
Poveži s Home Assistantom
Home Assistant bo potrdil, da dovoljujete dostop, potreben za pripravo HABRO.
Varna povezava
Pooblastitev poteka v Home Assistantu.
Skrbniška potrditev
Home Assistant vas lahko prosi, da odobrite repozitorij in namestitev.
Nadaljuj v Home Assistantu
Namestite HABRO Installer.
Home Assistant bo odprl natančno stran za
. Ne bi ga smeli iskati ročno.
Dokler je Installer nastavljen na ročni zagon, pustite možnost
»Zaženi ob zagonu« izklopljeno
. Predvideni postopek je:
Namesti → Zaženi → Odpri spletni vmesnik
Namestite, zaženite in odprite spletni vmesnik.
Ni vam treba nastaviti ničesar tehničnega.
BRO vas spremlja:
Možnost »Zaženi ob zagonu« sama ne namesti HABRO. Pustite jo izklopljeno.
Aplikacija Home Assistant za pripravo HABRO.
NAJPREJ
NATO
Odpri spletni vmesnik
NADALJUJ
Možnost »Zaženi ob zagonu« ostane izklopljena.
HABRO preveri vaš sistem.
Ko odprete Installer, HABRO preveri združljivost, zazna EBRO Auto in HABRO Companion, preveri pakete ter pripravi postopek.
Analiza je samodejna. Če je sistem že pripravljen, ne bo izvedla nepotrebnih sprememb. Če je potrebna namestitev, posodobitev ali popravilo, bo pripravila naslednji korak.
Deluje samostojno.
Vi spremljate stanje in počakate na rezultat diagnostike.
Stanje HABRO
Preverjanje sistema in priprava varnega postopka.
Home Assistant je povezan
Sistem je združljiv
Paketi so preverjeni
Cilj je preverjen
Varnost
Pripravlja se obnovitvena kopija.
Pred spreminjanjem aktivnih komponent HABRO preveri pakete in shrani stanje, potrebno za obnovitev namestitve, če končno preverjanje ne uspe.
Ko vam pokaže, kaj bo storil, HABRO zahteva
eno jasno potrditev
za izvedbo pripravljene namestitve ali popravila.
Preglejte in enkrat potrdite.
Spremembe se ne smejo začeti brez vaše odobritve.
Vse je pripravljeno
Paketi, cilj in obnovitev so preverjeni.
Obnovitvena kopija je pripravljena
Če končno preverjanje ni uspešno, lahko HABRO povrne prejšnje stanje.
Potrdi in namesti
Namestitev
HABRO se namesti in Home Assistant se znova zažene.
Po vaši potrditvi HABRO uporabi komponente in Home Assistant se znova zažene. Za nekaj minut lahko izgubite zaslon Installerja ali pa Home Assistant še ne bo na voljo.
Ne pritisnite znova gumba »Namesti«.
Postopek ohrani svoje stanje in se mora nadaljevati iz istega dnevnika, ko znova odprete HABRO Installer.
Počakate.
Če se zaslon zapre, se vrnite v
Nastavitve → Aplikacije → HABRO Installer → Odpri spletni vmesnik
To je trenutek, ki zahteva največ zaupanja:
ponovni zagon Home Assistanta je običajen del postopka. Ko znova odprete Installer, se napredek obnovi; namestitev se ne ponovi.
Nameščanje HABRO…
Prenašanje in preverjanje
Končano
Nameščanje komponent
Uveljavljanje nastavitev
Ponovni zagon Home Assistanta
Lahko traja nekaj minut
Končno preverjanje
Na čakanju
Če Home Assistant zapre ta zaslon:
Nastavitve → Aplikacije → HABRO Installer → Odpri spletni vmesnik.
Povežete svoj račun EBRO.
Ko so komponente nameščene, bo HABRO odprl
uradni config flow za EBRO
zunaj okvirja iframe Installerja.
Prijavne podatke za EBRO vnesete samo tam. Če HABRO dovolj zanesljivo prepozna eno vozilo, ga bo izbral samodejno; če obstaja dvom, vas bo vprašal.
Vnesete svoje prijavne podatke za EBRO
in vozilo izberete le, če je to res potrebno.
Poveži EBRO
Podatke vnesite samo v uradni obrazec Home Assistanta.
E-pošta / uporabniško ime EBRO
Geslo
Prijavnih podatkov za EBRO ne vnašajte na spletni strani HABRO ali na simuliranem zaslonu Installerja.
Prikaže se »HABRO je pripravljen«.
Postopek se konča, ko sta
EBRO Auto in HABRO Companion povezana in naložena
. To stanje pomeni, da ni več potrebnih tehničnih nastavitev.
Nato lahko zaprete HABRO Installer in se vrnete v aplikacijo.
Sporočilo je povsem jasno:
»HABRO je pripravljen«.
HABRO je pripravljen.
EBRO Auto in HABRO Companion sta povezana in naložena.
Ničesar več vam ni treba nastaviti. HABRO Installer lahko zaprete.
Vsakodnevni dostop
HABRO dodate na začetni zaslon.
Ko je HABRO pripravljen, lahko PWA dodate na začetni zaslon in ga odpirate kot aplikacijo. V združljivih brskalnikih se bo prikazalo pogovorno okno za namestitev; na iPhonu/iPadu boste videli navodila za uporabo možnosti
Deli → Dodaj na začetni zaslon → Dodaj
Izbirno:
HABRO dodate na začetni zaslon in ga nato odpirate prek njegove ikone.
Dodaj HABRO na začetni zaslon
Na iPhonu/iPadu: Deli → Dodaj na začetni zaslon → Dodaj.
Odpri HABRO
Zdaj lahko vstopite v HABRO.
Za začetek postopka odprite distribucijsko različico aplikacije. Ta vodnik bo ostal na voljo, da se boste lahko vrnili na kateri koli korak in po potrebi vprašali BRO.
Vstopi v HABRO
Odprl se bo app.habroremote.com
Kaj lahko pričakujete
Trenutki, ki se morda zdijo nenavadni, so povsem običajni.
Home Assistant zahteva več potrditev.
To je del mehanizma zaupanja za namestitev bootstrap-a.
Home Assistant se znova zažene.
Zaslon lahko za nekaj minut izgine. Namestitve ne ponavljajte.
Vrniti se morate v HABRO Installer.
Če se je WebView zaprl: Nastavitve → Aplikacije → HABRO Installer → Odpri spletni vmesnik.
Prijavni podatki za EBRO se pojavijo na koncu.
Vnesete jih izključno v uradni config flow Home Assistanta.
Zaključek je nedvoumen.
Postopek je končan šele, ko vidite »HABRO je pripravljen«.
Vizualni vodnik za namestitev · HABRO`),
    hr:lines(`Vodič za instalaciju · prije početka
Vizualni vodič za instalaciju
Instalirat ćete HABRO.
Ovako će postupak izgledati.
Kratak pregled kako biste znali što ćete vidjeti na svakom zaslonu, kada trebate reagirati i kada možete jednostavno pustiti HABRO da radi.
Pogledajte korake
Ispiši / spremi kao PDF
Ako se dijaloški okvir za ispis ne pojavi, ovaj preglednik blokira tu funkciju preglednika.
Otvorite vodič u novoj kartici
i ondje odaberite
Dijeli → Ispis
ili
Spremi u Datoteke kao PDF
Bez YAML-a
Nećete morati uređivati datoteke ni tražiti entitete.
Bez Terminala
Nećete morati upisivati naredbe ni pristupati putem SSH-a.
S mogućnošću oporavka
HABRO prije promjena priprema sigurnosnu kopiju za oporavak.
Postupak,
zaslon po zaslon.
Prikazi sučelja u ovom vodiču izrađeni su u HTML-u kako bi objasnili postupak. Ne zamjenjuju stvarne zaslone Home Assistanta, ali slijede tijek koji HABRO treba provesti.
Početak
Otvorite HABRO i odaberite „Instaliraj”.
Ulazna točka za korisnika je
. Na početnom zaslonu vidjet ćete logotip HABRO, pozdrav i dvije mogućnosti:
Prijava
Pri prvoj instalaciji pritisnite
. HABRO će objasniti da se za nastavak mora povezati s vašim Home Assistantom.
VI
Trebate učiniti samo jedno:
pritisnuti
što želite učiniti?
Autorizacija
Home Assistant traži vaše dopuštenje.
HABRO će vas odvesti u Home Assistant. Ako nemate otvorenu sesiju, prijavit ćete se. Home Assistant može prikazati administratorske potvrde kojima odobravate repozitorij i instalaciju HABRO Installera.
Te potvrde nisu pogreška: njima Home Assistant traži vaše dopuštenje prije instalacije.
Prijavite se i prihvatite potvrde
koje prikaže Home Assistant.
Poveži s Home Assistantom
Home Assistant potvrdit će da dopuštate pristup potreban za pripremu HABRO.
Sigurna veza
Autorizacija se obavlja u Home Assistantu.
Administratorska potvrda
Home Assistant može zatražiti da prihvatite repozitorij i instalaciju.
Nastavi u Home Assistantu
Instalirate HABRO Installer.
Home Assistant otvorit će točnu stranicu za
. Ne biste ga trebali tražiti ručno.
Dok je Installer postavljen na ručno pokretanje, ostavite
„Pokreni pri pokretanju” isključeno
. Predviđeni postupak je:
Instaliraj → Pokreni → Otvori web-sučelje
Instalirajte, pokrenite i otvorite web-sučelje.
Ne trebate ništa tehnički podešavati.
BRO vas prati:
„Pokreni pri pokretanju” ne instalira HABRO samo od sebe. Ostavite tu mogućnost isključenu.
Aplikacija za Home Assistant koja priprema HABRO.
PRVO
ZATIM
Otvori web-sučelje
NASTAVI
„Pokreni pri pokretanju” ostaje isključeno.
HABRO provjerava vaš sustav.
Nakon ulaska u Installer, HABRO provjerava kompatibilnost, otkriva EBRO Auto i HABRO Companion, provjerava pakete i priprema postupak.
Analiza je automatska. Ako je sustav već spreman, neće raditi nepotrebne promjene. Ako je potrebna instalacija, ažuriranje ili popravak, pripremit će sljedeći korak.
Radi samostalno.
Vi pratite stanje i čekate rezultat dijagnostike.
Status HABRO
Provjera sustava i priprema sigurnog postupka.
Home Assistant je povezan
Sustav je kompatibilan
Paketi su provjereni
Odredište je provjereno
Sigurnost
Priprema se kopija za oporavak.
Prije izmjene aktivnih komponenti HABRO provjerava pakete i čuva stanje potrebno za oporavak instalacije ako završna provjera ne uspije.
Nakon što pokaže što će učiniti, HABRO traži
jednu jasnu potvrdu
za izvođenje pripremljene instalacije ili popravka.
Pregledajte i potvrdite jednom.
Promjene ne smiju početi bez vašeg odobrenja.
Sve je spremno
Paketi, odredište i oporavak su provjereni.
Kopija za oporavak je spremna
Ako završna provjera nije uspješna, HABRO se može vratiti na prethodno stanje.
Potvrdi i instaliraj
Instalacija
HABRO se instalira i Home Assistant se ponovno pokreće.
Nakon vaše potvrde HABRO primjenjuje komponente i Home Assistant se ponovno pokreće. Zaslon Installera može nestati na nekoliko minuta ili Home Assistant možda još neće biti dostupan.
Nemojte ponovno pritisnuti „Instaliraj”.
Postupak čuva svoje stanje i mora se nastaviti iz istog dnevnika kada ponovno otvorite HABRO Installer.
Čekate.
Ako se zaslon zatvori, vratite se u
Postavke → Aplikacije → HABRO Installer → Otvori web-sučelje
Ovo je trenutak koji zahtijeva najviše povjerenja:
ponovno pokretanje Home Assistanta normalan je dio postupka. Ponovno otvaranje Installera vraća napredak i ne ponavlja instalaciju.
Instaliranje HABRO…
Preuzimanje i provjera
Dovršeno
Instaliranje komponenti
Primjena konfiguracije
Ponovno pokretanje Home Assistanta
Može potrajati nekoliko minuta
Završna provjera
Na čekanju
Ako Home Assistant zatvori ovaj zaslon:
Postavke → Aplikacije → HABRO Installer → Otvori web-sučelje.
Povezujete svoj EBRO račun.
Kada komponente budu instalirane, HABRO će otvoriti
službeni config flow za EBRO
izvan iframe okvira Installera.
Podaci za prijavu u EBRO unose se samo ondje. Ako HABRO dovoljno pouzdano prepozna jedno vozilo, automatski će ga odabrati; ako postoji nedoumica, pitat će vas.
Unosite svoje podatke za prijavu u EBRO
i vozilo birate samo ako je to doista potrebno.
Poveži EBRO
Podatke unosite isključivo u službeni obrazac Home Assistanta.
E-pošta / korisničko ime za EBRO
Lozinka
Podaci za prijavu u EBRO ne unose se na web-stranici HABRO ni na simuliranom zaslonu Installera.
Vidjet ćete „HABRO je spreman”.
Postupak završava kada su
EBRO Auto i HABRO Companion povezani i učitani
. To stanje znači da više nema tehničkih postavki na čekanju.
Tada možete zatvoriti HABRO Installer i vratiti se u aplikaciju.
Poruka je nedvosmislena:
„HABRO je spreman”.
HABRO je spreman.
EBRO Auto i HABRO Companion povezani su i učitani.
Ne trebate ništa više podešavati. Sada možete zatvoriti HABRO Installer.
Svakodnevni pristup
Dodajete HABRO na početni zaslon.
Kada je HABRO spreman, PWA možete dodati na početni zaslon i otvarati ga kao aplikaciju. U kompatibilnim preglednicima pojavit će se dijaloški okvir za instalaciju; na iPhoneu/iPadu vidjet ćete upute za
Dijeli → Dodaj na početni zaslon → Dodaj
Neobavezno:
HABRO dodate na početni zaslon i zatim mu pristupate putem njegove ikone.
Dodaj HABRO na početni zaslon
Na iPhoneu/iPadu: Dijeli → Dodaj na početni zaslon → Dodaj.
Otvori HABRO
Sada možete ući u HABRO.
Otvorite distribucijsku verziju aplikacije kako biste započeli postupak. Ovaj će vodič ostati dostupan kako biste se mogli vratiti na bilo koji korak i pitati BRO kad god zatreba.
Pristupi HABRO
Otvorit će se app.habroremote.com
Što možete očekivati
Trenuci koji se mogu činiti neobičnima… sasvim su normalni.
Home Assistant traži nekoliko potvrda.
To je dio mehanizma povjerenja za instalaciju bootstrapa.
Home Assistant se ponovno pokreće.
Zaslon može nestati na nekoliko minuta. Nemojte ponavljati instalaciju.
Morate se vratiti u HABRO Installer.
Ako se WebView zatvorio: Postavke → Aplikacije → HABRO Installer → Otvori web-sučelje.
Podaci za prijavu u EBRO pojavljuju se na kraju.
Unose se isključivo u službeni config flow Home Assistanta.
Završetak je nedvosmislen.
Postupak je završen tek kada vidite „HABRO je spreman”.
Vizualni vodič za instalaciju · HABRO`)
  };
  const locales={bg:'bg-BG',sl:'sl-SI',hr:'hr-HR'};
  const labels={bg:'Избор на език',sl:'Izberite jezik',hr:'Odaberite jezik'};
  const metadata={
    bg:{title:'Инсталиране на HABRO · Визуално ръководство',description:'Визуално ръководство стъпка по стъпка за инсталиране на HABRO в Home Assistant.'},
    sl:{title:'Namestitev HABRO · Vizualni vodnik',description:'Vizualni vodnik po korakih za namestitev HABRO v Home Assistant.'},
    hr:{title:'Instalacija HABRO · Vizualni vodič',description:'Vizualni vodič korak po korak za instalaciju HABRO u Home Assistantu.'}
  };
  const options=[...document.querySelectorAll('[data-language-option]')];
  const maps={};
  Object.entries(translations).forEach(([language,values])=>{maps[language]=new Map(sources.map((source,index)=>[source,values[index]]))});
  const apply=language=>{
    if(!maps[language])return;
    document.documentElement.lang=locales[language];
    guide.translatedNodes.forEach(item=>{item.node.nodeValue=item.leading+maps[language].get(item.pair.es)+item.trailing});
    document.title=metadata[language].title;
    const description=document.querySelector('meta[name="description"]');if(description)description.content=metadata[language].description;
    options.forEach(option=>{const active=option.dataset.languageOption===language;option.classList.toggle('is-active',active);option.setAttribute('aria-pressed',String(active))});
    document.querySelector('.guide-language-switch')?.setAttribute('aria-label',labels[language]);
    try{localStorage.setItem('habro-language-extra',language);localStorage.setItem('habro-marketing-lang',language);localStorage.setItem('habro-apple-lang',language)}catch(_){}
  };
  let initial='es';try{initial=localStorage.getItem('habro-language-extra')||localStorage.getItem('habro-marketing-lang')||'es'}catch(_){}
  if(maps[initial])apply(initial);
  else options.forEach(option=>{const active=option.dataset.languageOption===initial;option.classList.toggle('is-active',active);option.setAttribute('aria-pressed',String(active))});
  options.filter(option=>['es','pt'].includes(option.dataset.languageOption)).forEach(option=>option.addEventListener('click',()=>{try{localStorage.removeItem('habro-language-extra');localStorage.setItem('habro-marketing-lang',option.dataset.languageOption)}catch(_){};location.reload()},true));
  options.filter(option=>maps[option.dataset.languageOption]).forEach(option=>option.addEventListener('click',event=>{event.stopImmediatePropagation();apply(option.dataset.languageOption)},true));
})();
