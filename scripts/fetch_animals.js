#!/usr/bin/env node
/**
 * fetch_animals.js – build script for Slovak animal quiz database
 *
 * Uses a curated seed list with pre-written Slovak labels, facts, and
 * false facts. Only fetches image URLs from Wikipedia Summary API.
 *
 * Usage:
 *   node scripts/fetch_animals.js            # full build
 *   node scripts/fetch_animals.js --resume   # skip already-fetched animals
 *
 * Output: data/animals.json
 */

'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OUT_FILE = path.join(__dirname, '..', 'data', 'animals.json');
const RESUME   = process.argv.includes('--resume');

// ---------------------------------------------------------------------------
// Curated seed list – all text already in Slovak
// Each entry: { name, label, continent, sciName, fact, falseFacts, [ocean] }
//   name       – English name for Wikipedia API lookup
//   label      – Slovak name
//   continent  – Slovak continent (string or string[])
//   sciName    – Latin scientific name
//   fact       – true fact in Slovak
//   falseFacts – array of 3 plausible but false facts in Slovak
//   ocean      – (optional) Slovak ocean name (string or string[])
// ---------------------------------------------------------------------------
const ANIMALS_SEED = [
  // ═══════════════════════════════════════
  //  AFRIKA
  // ═══════════════════════════════════════
  { name:"Lion", label:"Lev", continent:"Afrika", sciName:"Panthera leo",
    fact:"Lev je jediná mačkovitá šelma, ktorá žije v sociálnych skupinách nazývaných svorky.",
    falseFacts:["Lev je najrýchlejšie suchozemské zviera v Afrike.","Levy žijú výhradne samotársky a stretávajú sa len počas párenia.","Lev dokáže šplhať po stromoch lepšie ako leopard."] },
  { name:"African elephant", label:"Slon africký", continent:"Afrika", sciName:"Loxodonta africana",
    fact:"Slon africký je najväčšie suchozemské zviera na svete a môže vážiť až 6 ton.",
    falseFacts:["Slon africký má menšie uši ako slon indický.","Slony africké žijú samotársky a nemajú sociálnu štruktúru.","Slon africký sa dožíva maximálne 30 rokov."] },
  { name:"Giraffe", label:"Žirafa", continent:"Afrika", sciName:"Giraffa camelopardalis",
    fact:"Žirafa je najvyššie žijúce suchozemské zviera s výškou až 5,5 metra.",
    falseFacts:["Žirafa má viac krčných stavcov ako väčšina cicavcov.","Žirafa dokáže spať až 12 hodín denne.","Žirafa nedokáže plávať kvôli svojej výške."] },
  { name:"Plains zebra", label:"Zebra stepná", continent:"Afrika", sciName:"Equus quagga",
    fact:"Každá zebra má jedinečný vzor pruhov, podobne ako odtlačky prstov u ľudí.",
    falseFacts:["Zebry majú pod pruhmi čisto bielu kožu.","Zebra stepná je najrýchlejšie zviera v africkej savane.","Pruhy zebier slúžia primárne na reguláciu teploty."] },
  { name:"Hippopotamus", label:"Hroch obojživelný", continent:"Afrika", sciName:"Hippopotamus amphibius",
    fact:"Hroch trávi väčšinu dňa vo vode a dokáže zadržať dych až 5 minút.",
    falseFacts:["Hroch je pokojné bylinožravé zviera, ktoré nikdy neútočí na ľudí.","Hroch obojživelný je výborný plavec a dokáže plávať aj v hlbokej vode.","Hroch patrí medzi najpomalšie veľké cicavce Afriky."] },
  { name:"Western gorilla", label:"Gorila nížinná", continent:"Afrika", sciName:"Gorilla gorilla",
    fact:"Gorila nížinná zdieľa približne 98 % svojej DNA s človekom.",
    falseFacts:["Gorily sú agresívne zvieratá, ktoré pravidelne útočia na iné skupiny.","Gorila nížinná je najväčší primát a môže vážiť až 500 kg.","Gorily trávia väčšinu času na stromoch a zriedka zostupujú na zem."] },
  { name:"Cheetah", label:"Gepard štíhly", continent:"Afrika", sciName:"Acinonyx jubatus",
    fact:"Gepard je najrýchlejšie suchozemské zviera a dokáže bežať rýchlosťou až 112 km/h.",
    falseFacts:["Gepard dokáže udržať maximálnu rýchlosť niekoľko kilometrov.","Gepard loví hlavne v noci, keď je chladnejšie.","Gepard má zaťahovateľné pazúry ako väčšina mačkovitých šeliem."] },
  { name:"Leopard", label:"Leopard škvrnitý", continent:"Afrika", sciName:"Panthera pardus",
    fact:"Leopard často vyťahuje svoju korisť na stromy, aby ju ochránil pred inými predátormi.",
    falseFacts:["Leopard škvrnitý žije výhradne v hustých tropických pralesoch.","Leopard je najväčšia mačkovitá šelma v Afrike.","Leopardy žijú v pároch a spoločne sa starajú o mláďatá."] },
  { name:"African buffalo", label:"Byvol africký", continent:"Afrika", sciName:"Syncerus caffer",
    fact:"Byvol africký je považovaný za jedno z najnebezpečnejších zvierat Afriky a nemá priameho predátora okrem leva.",
    falseFacts:["Byvol africký bol úspešne domestikovaný rovnako ako domáci dobytok.","Byvoly africké sú samotárske zvieratá žijúce v malých rodinných skupinách.","Byvol africký je blízky príbuzný amerického bizóna."] },
  { name:"Spotted hyena", label:"Hyena škvrnitá", continent:"Afrika", sciName:"Crocuta crocuta",
    fact:"Hyena škvrnitá má najsilnejší zhryz v pomere k veľkosti tela spomedzi všetkých cicavcov.",
    falseFacts:["Hyena škvrnitá je výhradne mrchožrút a nikdy neloví živú korisť.","Hyeny sú príbuzné psom a patria do čeľade psovitých.","Hyena škvrnitá žije samotársky a netvori kŕdle."] },
  { name:"Meerkat", label:"Surikata vlnkovaná", continent:"Afrika", sciName:"Suricata suricatta",
    fact:"Surikaty žijú v kolóniách a majú strážcov, ktorí stoja na zadných nohách a sledujú okolie.",
    falseFacts:["Surikaty sú nočné zvieratá aktívne hlavne po zotmení.","Surikata vlnkovaná žije samotársky a brání si vlastné teritórium.","Surikaty sa živia výhradne rastlinnou potravou."] },
  { name:"African wild dog", label:"Pes hyenový", continent:"Afrika", sciName:"Lycaon pictus",
    fact:"Pes hyenový má úspešnosť lovu okolo 80 %, čo je najvyššia medzi veľkými predátormi.",
    falseFacts:["Pes hyenový je blízky príbuzný hyeny škvrnitej.","Psy hyenové žijú samotársky a spájajú sa len počas rozmnožovania.","Pes hyenový loví výhradne malú korisť ako hlodavce a zajace."] },
  { name:"Mandrill", label:"Mandril", continent:"Afrika", sciName:"Mandrillus sphinx",
    fact:"Mandril je najväčšia a najfarebnejšia opica na svete s výrazným modrým a červeným sfarbením tváre.",
    falseFacts:["Mandril je druh ľudoopa príbuzný gorilám.","Mandrily žijú výhradne na stromoch a nikdy nezostupujú na zem.","Výrazné sfarbenie tváre mandrila slúži na odstrašenie predátorov."] },
  { name:"Black rhinoceros", label:"Nosorožec čierny", continent:"Afrika", sciName:"Diceros bicornis",
    fact:"Nosorožec čierny má prehnutý horný pysk prispôsobený na trhanie listov z kríkov.",
    falseFacts:["Nosorožec čierny je väčší ako nosorožec biely.","Roh nosorožca je z kostného tkaniva podobného parohu.","Nosorožec čierny má výborný zrak a slabý čuch."] },
  { name:"Nile crocodile", label:"Krokodíl nílsky", continent:"Afrika", sciName:"Crocodylus niloticus",
    fact:"Krokodíl nílsky je najväčší africký plaz a môže dorásť do dĺžky 6 metrov.",
    falseFacts:["Krokodíl nílsky žije výhradne v rieke Níl.","Krokodíly nílske nedokážu bežať po súši.","Krokodíl nílsky je bylinožravec, ktorý sa živí vodnými rastlinami."] },
  { name:"Common ostrich", label:"Pštros africký", continent:"Afrika", sciName:"Struthio camelus",
    fact:"Pštros africký je najväčší žijúci vták a dokáže bežať rýchlosťou až 70 km/h.",
    falseFacts:["Pštros strká hlavu do piesku, keď sa bojí.","Pštros africký dokáže lietať na krátke vzdialenosti.","Vajce pštrosa je najmenšie vtáčie vajce v pomere k veľkosti tela."] },
  { name:"Greater flamingo", label:"Plameniak ružový", continent:"Afrika", sciName:"Phoenicopterus roseus",
    fact:"Plameniak získava svoju ružovú farbu z karotenoidov v potrave, najmä z kôrovcov a rias.",
    falseFacts:["Plameniaky sa rodia ružové a s vekom postupne bledú.","Plameniak ružový stojí na jednej nohe, pretože má problémy s rovnováhou.","Plameniaky sú samotárske vtáky žijúce v pároch."] },
  { name:"Warthog", label:"Bradavičník africký", continent:"Afrika", sciName:"Phacochoerus africanus",
    fact:"Bradavičník má zvyk utekať s chvostom nahor, čo slúži ako signál pre ostatných členov skupiny.",
    falseFacts:["Bradavičník je blízky príbuzný domáceho prasaťa.","Bradavičníky sú aktívne hlavne v noci.","Bradavičník africký je agresívny predátor malých zvierat."] },
  { name:"Blue wildebeest", label:"Pakôň modrý", continent:"Afrika", sciName:"Connochaetes taurinus",
    fact:"Pakone modré podnikajú jednu z najväčších migrácií cicavcov na svete v oblasti Serengeti.",
    falseFacts:["Pakôň modrý je samotárske zviera žijúce mimo stád.","Pakone modré sú všežravce živiace sa aj hmyzom.","Pakôň modrý dostal názov podľa modrej farby svojej srsti."] },
  { name:"Springbok", label:"Antilopa skákavá", continent:"Afrika", sciName:"Antidorcas marsupialis",
    fact:"Antilopa skákavá dokáže vyskočiť až 3,5 metra do výšky pri charakteristickom správaní zvanom pronking.",
    falseFacts:["Antilopa skákavá je najväčší druh antilopy v Afrike.","Antilopa skákavá žije v hustých lesoch.","Antilopa skákavá je pomalý bežec, ktorý sa spolieha na maskovanie."] },
  { name:"Aardvark", label:"Hrabáč kapský", continent:"Afrika", sciName:"Orycteropus afer",
    fact:"Hrabáč kapský je jediný žijúci zástupca radu Tubulidentata a živí sa hlavne termitmi.",
    falseFacts:["Hrabáč kapský je príbuzný mravčiara juhoamerického.","Hrabáč kapský je denné zviera aktívne počas najteplejších hodín.","Hrabáč kapský loví korisť pomocou výborného zraku."] },
  { name:"Okapi", label:"Okapi", continent:"Afrika", sciName:"Okapia johnstoni",
    fact:"Okapi je najbližší žijúci príbuzný žirafy, napriek tomu, že vyzerá skôr ako kôň s pruhovanými nohami.",
    falseFacts:["Okapi žije v otvorených savanách strednej Afriky.","Okapi je príbuzné zebier, čo dokazujú jeho pruhy na nohách.","Okapi bolo objavené európskymi vedcami už v 18. storočí."] },
  { name:"Shoebill", label:"Člnozobec kráľovský", continent:"Afrika", sciName:"Balaeniceps rex",
    fact:"Člnozobec má obrovský zobák v tvare člna, ktorým loví ryby, hady a dokonca aj malé krokodíly.",
    falseFacts:["Člnozobec kráľovský je výborný letec migrujúci na dlhé vzdialenosti.","Člnozobec žije vo veľkých kolóniách ako plameniaky.","Člnozobec sa živí výhradne hmyzom a drobnými bezstavovcami."] },
  { name:"African penguin", label:"Tučniak okuliarnatý", continent:"Afrika", sciName:"Spheniscus demersus",
    fact:"Tučniak okuliarnatý je jediný druh tučniaka hniezdiaci na africkom kontinente.",
    falseFacts:["Tučniak okuliarnatý žije v studených vodách okolo Antarktídy.","Tučniak okuliarnatý dokáže lietať na krátke vzdialenosti.","Tučniaky okuliarnaté žijú samotársky mimo hniezdnej sezóny."] },
  { name:"Honey badger", label:"Medojed kapský", continent:"Afrika", sciName:"Mellivora capensis",
    fact:"Medojed kapský je známy svojou nebojácnosťou a dokáže odolať aj uhryznutiu jedovatých hadov.",
    falseFacts:["Medojed kapský sa živí výhradne medom.","Medojed kapský je pomalé a neobratné zviera.","Medojed je príbuzný medveďom a patrí do čeľade medveďovitých."] },
  { name:"Caracal", label:"Karakal", continent:"Afrika", sciName:"Caracal caracal",
    fact:"Karakal dokáže vyskočiť do výšky 3 metre a chytiť vtáka za letu.",
    falseFacts:["Karakal je najväčšia mačkovitá šelma žijúca v Afrike.","Karakal žije vo veľkých skupinách s dominantným samcom.","Karakal sa živí výhradne hlodavcami a hmyzom."] },
  { name:"Serval", label:"Serval", continent:"Afrika", sciName:"Leptailurus serval",
    fact:"Serval má najdlhšie nohy v pomere k telu spomedzi všetkých mačkovitých šeliem.",
    falseFacts:["Serval je nočný lovec, ktorý nikdy neloví cez deň.","Serval žije vo vlhkých tropických pralesoch.","Serval loví výhradne v skupinách podobne ako levy."] },
  { name:"Secretary bird", label:"Hadiarka", continent:"Afrika", sciName:"Sagittarius serpentarius",
    fact:"Hadiarka loví hady tak, že ich udiera silnými nohami a dupne na ne s obrovskou silou.",
    falseFacts:["Hadiarka je dravý vták, ktorý loví korisť z vzduchu ako orol.","Hadiarka je malý vták podobný veľkosti holuba.","Hadiarka je nočný dravec príbuzný sovám."] },
  { name:"Gerenuk", label:"Gazela žirafia", continent:"Afrika", sciName:"Litocranius walleri",
    fact:"Gazela žirafia dokáže stáť na zadných nohách a tak sa dostať k listom na vysokých konároch.",
    falseFacts:["Gazela žirafia je najrýchlejší druh gazely v Afrike.","Gazela žirafia pije pravidelne vodu ako ostatné gazely.","Gazela žirafia žije vo veľkých stádach s tisíckami jedincov."] },
  { name:"Impala", label:"Impala", continent:"Afrika", sciName:"Aepyceros melampus",
    fact:"Impala dokáže skočiť do dĺžky až 10 metrov a do výšky 3 metre pri úteku pred predátorom.",
    falseFacts:["Impala je najväčšia antilopa v Afrike.","Impaly majú rohy samce aj samice.","Impala sa živí hlavne kôrou stromov a koreňmi."] },
  { name:"African fish eagle", label:"Orliak krikľavý", continent:"Afrika", sciName:"Haliaeetus vocifer",
    fact:"Orliak krikľavý má charakteristický prenikavý krik, ktorý sa často považuje za zvuk Afriky.",
    falseFacts:["Orliak krikľavý loví výhradne na súši.","Orliak krikľavý je najmenší druh orliaka na svete.","Orliak krikľavý žije samotársky a nemá stály pár."] },
  { name:"African grey parrot", label:"Papagáj sivý", continent:"Afrika", sciName:"Psittacus erithacus",
    fact:"Papagáj sivý je považovaný za najinteligentnejšieho papagája a dokáže sa naučiť stovky slov.",
    falseFacts:["Papagáj sivý žije vo veľkých kolóniách na otvorených pláňach.","Papagáj sivý sa v prírode dožíva maximálne 10 rokov.","Papagáj sivý má výrazne farebné perie podobné papagájovi ara."] },
  { name:"Bongo antelope", label:"Bongo", continent:"Afrika", sciName:"Tragelaphus eurycerus",
    fact:"Bongo je najväčšia a najťažšia africká lesná antilopa s výraznými bielymi pruhmi na tele.",
    falseFacts:["Bongo žije v otvorených savanách a vyhýba sa lesom.","Bongo nemá rohy, podobne ako samice iných antilop.","Bongo je domestikované zviera chované pre mäso v Afrike."] },
  { name:"Greater kudu", label:"Kudu veľký", continent:"Afrika", sciName:"Tragelaphus strepsiceros",
    fact:"Samec kudu veľkého má impozantné špirálovité rohy, ktoré môžu dorásť do dĺžky 1,8 metra.",
    falseFacts:["Kudu veľký je najmenší druh antilopy v Afrike.","Samice kudu veľkého majú rovnako veľké rohy ako samce.","Kudu veľký žije výhradne na otvorených pláňach bez stromov."] },
  { name:"Common eland", label:"Antilopa losovitá", continent:"Afrika", sciName:"Tragelaphus oryx",
    fact:"Antilopa losovitá je najväčšia antilopa na svete a napriek svojej veľkosti dokáže preskočiť 2,5 metra vysoký plot.",
    falseFacts:["Antilopa losovitá je príbuzná losa európskeho, čo vysvetľuje jej názov.","Antilopa losovitá je rýchly bežec dosahujúci rýchlosť geparda.","Antilopa losovitá žije samotársky v hustých tropických lesoch."] },
  { name:"Gemsbok", label:"Prímorožec juhoafrický", continent:"Afrika", sciName:"Oryx gazella",
    fact:"Prímorožec juhoafrický má dlhé rovné rohy a dokáže prežiť v extrémne suchých podmienkach bez pitia vody celé týždne.",
    falseFacts:["Prímorožec juhoafrický žije výhradne v blízkosti vodných zdrojov.","Prímorožec má krátke zakrivené rohy podobné kozorožcovi.","Prímorožec juhoafrický je aktívny výhradne v noci."] },
  { name:"Sable antelope", label:"Antilopa vraná", continent:"Afrika", sciName:"Hippotragus niger",
    fact:"Antilopa vraná má dlhé zakrivené rohy a samce majú výrazné čierne sfarbenie.",
    falseFacts:["Antilopa vraná je biela s hnedými škvrnami.","Antilopa vraná nemá rohy – ani samce, ani samice.","Antilopa vraná žije v mokradiach a bažinách."] },
  { name:"Topi", label:"Topi", continent:"Afrika", sciName:"Damaliscus lunatus",
    fact:"Topi je jedna z najrýchlejších antilop a dokáže bežať rýchlosťou až 70 km/h.",
    falseFacts:["Topi je pomalá antilopa, ktorá sa spolieha na maskovanie.","Topi žije samotársky vo vysokohorských oblastiach.","Topi sa živí hlavne koreňmi a podzemkmi."] },
  { name:"Kirk's dik-dik", label:"Dik-dik Kirkov", continent:"Afrika", sciName:"Madoqua kirkii",
    fact:"Dik-dik je jedna z najmenších antilop na svete s výškou len okolo 35 cm.",
    falseFacts:["Dik-dik žije vo veľkých stádach s desiatkami jedincov.","Dik-dik je výborný plavec a často sa zdržiava pri vodných tokoch.","Dik-dik dostal svoje meno podľa sfarbenia srsti."] },
  { name:"African civet", label:"Cibetka africká", continent:"Afrika", sciName:"Civettictis civetta",
    fact:"Cibetka africká produkuje pižmo, ktoré sa historicky používalo vo výrobe parfumov.",
    falseFacts:["Cibetka africká je príbuzná mačkám domácim.","Cibetka africká je denné zviera žijúce na stromoch.","Cibetka africká sa živí výhradne ovocím a zeleninou."] },
  { name:"Rock hyrax", label:"Daman skalný", continent:"Afrika", sciName:"Procavia capensis",
    fact:"Daman skalný je prekvapivo najbližší žijúci príbuzný slona, napriek svojej malej veľkosti.",
    falseFacts:["Daman skalný je druh hlodavca príbuzný morčatám.","Daman skalný žije pod zemou v zložitých norách.","Daman skalný je aktívny výhradne v noci."] },
  { name:"Cape porcupine", label:"Dikobraz juhoafrický", continent:"Afrika", sciName:"Hystrix africaeaustralis",
    fact:"Dikobraz juhoafrický má ostne dlhé až 50 cm, ktoré dokáže nastrošiť na obranu pred predátormi.",
    falseFacts:["Dikobraz dokáže vystreľovať svoje ostne na predátorov.","Dikobraz juhoafrický žije na stromoch podobne ako opice.","Dikobraz juhoafrický sa živí hlavne hmyzom a larvami."] },
  { name:"Marabou stork", label:"Marabu africký", continent:"Afrika", sciName:"Leptoptilos crumenifer",
    fact:"Marabu africký má rozpätie krídel až 3,2 metra, čo je jedno z najväčších medzi vtákmi.",
    falseFacts:["Marabu africký sa živí výhradne rybami.","Marabu africký je malý vták podobný veľkosti bocianu bieleho.","Marabu africký je výborný spevák s melodickým hlasom."] },
  { name:"Lilac-breasted roller", label:"Krakľa modrohrdlá", continent:"Afrika", sciName:"Coracias caudatus",
    fact:"Krakľa modrohrdlá má jedno z najfarebnejších perí spomedzi afrických vtákov s ôsmimi rôznymi farbami.",
    falseFacts:["Krakľa modrohrdlá je veľký dravý vták.","Krakľa modrohrdlá je celoročne sivo sfarbený nenápadný vták.","Krakľa modrohrdlá žije vo veľkých kŕdľoch v blízkosti vody."] },
  { name:"Ground pangolin", label:"Luskáň stepný", continent:"Afrika", sciName:"Smutsia temminckii",
    fact:"Luskáň je jediný cicavec na svete pokrytý keratínovými šupinami a pri nebezpečenstve sa zroluje do gule.",
    falseFacts:["Luskáň stepný je druh plaza príbuzný krokodílom.","Šupiny luskáňa sú z kostného tkaniva podobného panciernatcom.","Luskáň stepný žije vo vode a na súši ako obojživelník."] },
  { name:"Pygmy hippopotamus", label:"Hroch libérijský", continent:"Afrika", sciName:"Choeropsis liberiensis",
    fact:"Hroch libérijský je oveľa menší ako hroch obojživelný a vedie samotársky nočný život v lesoch.",
    falseFacts:["Hroch libérijský žije vo veľkých stádach ako jeho väčší príbuzný.","Hroch libérijský je rovnako veľký ako hroch obojživelný.","Hroch libérijský žije v otvorených savanách."] },
  { name:"White rhinoceros", label:"Nosorožec biely", continent:"Afrika", sciName:"Ceratotherium simum",
    fact:"Nosorožec biely má široký rovný pysk prispôsobený na spásanie trávy a je väčší ako nosorožec čierny.",
    falseFacts:["Nosorožec biely dostal meno podľa bielej farby svojej kože.","Nosorožec biely má jeden roh na rozdiel od nosorožca čierneho.","Nosorožec biely je výborný plavec a často sa zdržiava vo vode."] },
  { name:"Bonobo", label:"Bonobo", continent:"Afrika", sciName:"Pan paniscus",
    fact:"Bonobo je spolu so šimpanzom najbližší príbuzný človeka a konflikty rieši často sociálnym správaním.",
    falseFacts:["Bonobo je väčšie a agresívnejšie ako šimpanz.","Bonobo žije v savanách východnej Afriky.","Bonobo sa živí hlavne mäsom a hmyzom."] },
  { name:"Common chimpanzee", label:"Šimpanz učenlivý", continent:"Afrika", sciName:"Pan troglodytes",
    fact:"Šimpanz učenlivý je schopný používať nástroje, napríklad vetvičky na lovenie termitov.",
    falseFacts:["Šimpanz žije samotársky a vyhýba sa kontaktu s ostatnými šimpanzmi.","Šimpanz je výhradne bylinožravec.","Šimpanz učenlivý nedokáže komunikovať s ostatnými členmi skupiny."] },
  { name:"Olive baboon", label:"Pavián olivový", continent:"Afrika", sciName:"Papio anubis",
    fact:"Pavián olivový žije v zložito organizovaných skupinách s jasnou sociálnou hierarchiou.",
    falseFacts:["Pavián olivový je samotárske zviera žijúce v pároch.","Pavián olivový sa živí výhradne hmyzom a drobnými živočíchmi.","Pavián olivový žije na stromoch a takmer nikdy nezostupuje na zem."] },
  { name:"Black mamba", label:"Mamba čierna", continent:"Afrika", sciName:"Dendroaspis polylepis",
    fact:"Mamba čierna je najrýchlejší had na svete, dokáže sa pohybovať rýchlosťou až 20 km/h.",
    falseFacts:["Mamba čierna má čiernu farbu tela, podľa čoho dostala meno.","Mamba čierna je nejedovatý had, ktorý škrtí svoju korisť.","Mamba čierna žije výhradne na stromoch a nikdy nechodí po zemi."] },
  { name:"Gelada", label:"Gelada", continent:"Afrika", sciName:"Theropithecus gelada",
    fact:"Gelada je jediná opica na svete, ktorá sa živí prevažne trávou a žije vo vysokohorských oblastiach Etiópie.",
    falseFacts:["Gelada žije v tropických pralesoch strednej Afriky.","Gelada je druh paviána žijúci v malých rodinných skupinách.","Gelada sa živí hlavne ovocím a hmyzom."] },
  { name:"Nile monitor", label:"Varan nílsky", continent:"Afrika", sciName:"Varanus niloticus",
    fact:"Varan nílsky je jeden z najväčších jašterov v Afrike a výborný plavec.",
    falseFacts:["Varan nílsky je jedovatý jašter nebezpečný pre človeka.","Varan nílsky žije výhradne na púšti.","Varan nílsky sa živí rastlinnou potravou."] },
  { name:"African bullfrog", label:"Ropucha africká", continent:"Afrika", sciName:"Pyxicephalus adspersus",
    fact:"Africká ropucha je jedna z najväčších žiab na svete a samec agresívne bráni svoje žubrienky.",
    falseFacts:["Africká ropucha je jedovatá a nebezpečná pre ľudí.","Africká ropucha žije výhradne vo vode a nikdy nevychádza na súš.","Africká ropucha je najmenšia žaba v Afrike."] },
  { name:"Lappet-faced vulture", label:"Sup ušatý", continent:"Afrika", sciName:"Torgos tracheliotos",
    fact:"Sup ušatý je najväčší africký sup s rozpätím krídel až 2,9 metra.",
    falseFacts:["Sup ušatý loví živú korisť ako orol.","Sup ušatý je malý dravec veľkosti vrany.","Sup ušatý žije v hustých tropických pralesoch."] },
  { name:"African wild cat", label:"Mačka púštna", continent:"Afrika", sciName:"Felis lybica",
    fact:"Mačka púštna je predkom všetkých domácich mačiek a bola domestikovaná pred približne 10 000 rokmi.",
    falseFacts:["Mačka púštna je veľká šelma podobná levovi.","Mačka púštna žije výhradne vo veľkých skupinách.","Mačka púštna bola domestikovaná v Európe pred 500 rokmi."] },

  // ═══════════════════════════════════════
  //  ÁZIA – bude doplnené v ďalšej dávke
  // ═══════════════════════════════════════

  // ═══════════════════════════════════════
  //  EURÓPA – bude doplnené v ďalšej dávke
  // ═══════════════════════════════════════

  // ═══════════════════════════════════════
  //  SEVERNÁ AMERIKA – bude doplnené v ďalšej dávke
  // ═══════════════════════════════════════

  // ═══════════════════════════════════════
  //  JUŽNÁ AMERIKA – bude doplnené v ďalšej dávke
  // ═══════════════════════════════════════

  // ═══════════════════════════════════════
  //  AUSTRÁLIA – bude doplnené v ďalšej dávke
  // ═══════════════════════════════════════

  // ═══════════════════════════════════════
  //  ANTARKTÍDA – bude doplnené v ďalšej dávke
  // ═══════════════════════════════════════

];

// ---------------------------------------------------------------------------
// Wikipedia Summary API fetch (Node.js)
// ---------------------------------------------------------------------------
function fetchSummary(title) {
  return new Promise((resolve) => {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const options = { headers: { 'User-Agent': 'AnimalQuizBot/1.0 (educational project)' } };
    https.get(url, options, res => {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => {
        if (res.statusCode === 404) return resolve(null);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(body)); } catch { resolve(null); }
        } else {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function fetchSummaryWithRetry(title, retries = 3) {
  for (let i = 1; i <= retries; i++) {
    const result = await fetchSummary(title);
    if (result !== null) return result;
    if (i < retries) await new Promise(r => setTimeout(r, 1000 * i));
  }
  return null;
}

function buildImageUrl(summary) {
  if (summary.originalimage?.source) return summary.originalimage.source;
  if (summary.thumbnail?.source) return summary.thumbnail.source.replace(/\/\d+px-/, '/800px-');
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\nGenerating animals.json from ${ANIMALS_SEED.length} seeds…\n`);

  // Resume: load existing results and skip already-processed animals
  let existing = [];
  const existingNames = new Set();
  if (RESUME && fs.existsSync(OUT_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
      existing.forEach(a => existingNames.add(a.label));
      console.log(`  Resuming – ${existing.length} animals already in archive.\n`);
    } catch { /* ignore bad JSON */ }
  }

  const results = [...existing];
  const seen    = new Set([...existingNames]);
  let ok = existing.length, skip = 0;

  const BATCH = 6;
  for (let i = 0; i < ANIMALS_SEED.length; i += BATCH) {
    const batch = ANIMALS_SEED.slice(i, i + BATCH);
    await Promise.all(batch.map(async seed => {
      if (seen.has(seed.label)) { skip++; return; }
      seen.add(seed.label);

      const summary = await fetchSummaryWithRetry(seed.name);
      if (!summary) { console.log(`  – skip (no article): ${seed.name}`); skip++; return; }

      const imageUrl = buildImageUrl(summary);
      if (!imageUrl) { console.log(`  – skip (no image):   ${seed.name}`); skip++; return; }

      const id = summary.wikibase_item
        ? `http://www.wikidata.org/entity/${summary.wikibase_item}`
        : `https://en.wikipedia.org/wiki/${encodeURIComponent(seed.name)}`;

      const animal = {
        id,
        label:      seed.label,
        imageUrl,
        continent:  seed.continent,
        sciName:    seed.sciName,
        fact:       seed.fact,
        falseFacts: seed.falseFacts,
      };
      if (seed.ocean) animal.ocean = seed.ocean;

      results.push(animal);
      ok++;
    }));

    process.stdout.write(`\r  ${Math.min(i + BATCH, ANIMALS_SEED.length)}/${ANIMALS_SEED.length}  ok:${ok}`);
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n\n=== HOTOVO ===`);
  console.log(`Úspešných: ${ok}  /  Preskočených: ${skip}`);

  // Per-continent summary
  const byCont = {};
  for (const a of results) {
    const conts = Array.isArray(a.continent) ? a.continent : [a.continent];
    for (const c of conts) byCont[c] = (byCont[c] || 0) + 1;
  }
  for (const [c, n] of Object.entries(byCont).sort()) console.log(`  ${c}: ${n}`);

  if (results.length < 15) {
    console.error('\n✗ Príliš málo zvierat! Skontroluj internetové pripojenie.');
    process.exit(1);
  }

  const outDir = path.dirname(OUT_FILE);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nZapísaných ${results.length} zvierat → ${OUT_FILE}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
