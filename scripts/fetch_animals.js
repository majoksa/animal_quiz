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
  //  ÁZIA
  // ═══════════════════════════════════════
  { name:"Bengal tiger", label:"Tiger bengálsky", continent:"Ázia", sciName:"Panthera tigris tigris",
    fact:"Tiger bengálsky je najväčšia mačkovitá šelma na svete a výborný plavec.",
    falseFacts:["Tiger bengálsky žije v skupinách podobne ako levy.","Tiger bengálsky sa živí prevažne rastlinnou potravou.","Tiger bengálsky má jednofarebné oranžové sfarbenie bez pruhov v dospelosti."] },
  { name:"Giant panda", label:"Panda veľká", continent:"Ázia", sciName:"Ailuropoda melanoleuca",
    fact:"Panda veľká sa živí takmer výhradne bambusovými výhonkami a denne zje až 38 kg bambusu.",
    falseFacts:["Panda veľká je všežravec, ktorý pravidelne loví malé cicavce.","Panda veľká žije v tropických dažďových pralesoch juhovýchodnej Ázie.","Panda veľká je druh medveďa, ktorý hibernuje počas zimy."] },
  { name:"Asian elephant", label:"Slon indický", continent:"Ázia", sciName:"Elephas maximus",
    fact:"Slon indický má menšie uši ako slon africký a na chobote má jeden prstovitý výbežok.",
    falseFacts:["Slon indický je väčší ako slon africký.","Slon indický žije samotársky a nemá sociálnu štruktúru.","Slon indický má na chobote dva prstovité výbežky rovnako ako slon africký."] },
  { name:"Snow leopard", label:"Leopard snežný", continent:"Ázia", sciName:"Panthera uncia",
    fact:"Leopard snežný žije vo vysokohorských oblastiach do nadmorskej výšky 5 500 metrov a má hustú sivú srsť.",
    falseFacts:["Leopard snežný dokáže revať rovnako hlasno ako lev.","Leopard snežný žije v tropických pralesoch Ázie.","Leopard snežný žije v skupinách po 10-15 jedincov."] },
  { name:"Komodo dragon", label:"Komodský varan", continent:"Ázia", sciName:"Varanus komodoensis",
    fact:"Komodský varan je najväčší žijúci jašter na svete a jeho sliny obsahujú jedovaté látky.",
    falseFacts:["Komodský varan chŕli oheň na obranu pred predátormi.","Komodský varan je bylinožravec živiaci sa tropickým ovocím.","Komodský varan žije na všetkých ostrovoch juhovýchodnej Ázie."] },
  { name:"King cobra", label:"Kobra kráľovská", continent:"Ázia", sciName:"Ophiophagus hannah",
    fact:"Kobra kráľovská je najdlhší jedovatý had na svete a môže dorásť do dĺžky 5,5 metra.",
    falseFacts:["Kobra kráľovská sa živí hlavne hlodavcami a vtákmi.","Kobra kráľovská je najjedovatejší had na svete.","Kobra kráľovská žije vo vode a loví ryby."] },
  { name:"Orangutan", label:"Orangutan", continent:"Ázia", sciName:"Pongo pygmaeus",
    fact:"Orangutan je jediný veľký ľudoop žijúci v Ázii a trávi väčšinu života na stromoch.",
    falseFacts:["Orangutan žije v skupinách po 20-30 jedincov.","Orangutan je výborný plavec a často sa zdržiava pri vode.","Orangutan žije na zemi a na stromy lezie len zriedka."] },
  { name:"Proboscis monkey", label:"Kahau nosatý", continent:"Ázia", sciName:"Nasalis larvatus",
    fact:"Kahau nosatý má výrazný veľký nos, ktorý u samcov môže dorásť do dĺžky 10 cm.",
    falseFacts:["Kahau nosatý používa svoj nos na hľadanie potravy pod vodou.","Kahau nosatý žije v suchých savanách Bornej.","Veľký nos kahaua slúži na odstrašenie predátorov."] },
  { name:"Indian rhinoceros", label:"Nosorožec indický", continent:"Ázia", sciName:"Rhinoceros unicornis",
    fact:"Nosorožec indický má hrubú kožu zloženú do záhybov, čo mu dáva vzhľad pancierového brnenia.",
    falseFacts:["Nosorožec indický má dva rohy rovnako ako nosorožec africký.","Nosorožec indický žije v horských oblastiach Himalájí.","Nosorožec indický je mäsožravec loviaci malé cicavce."] },
  { name:"Red panda", label:"Panda červená", continent:"Ázia", sciName:"Ailurus fulgens",
    fact:"Panda červená nie je príbuzná pandy veľkej a patrí do vlastnej čeľade Ailuridae.",
    falseFacts:["Panda červená je mláďa pandy veľkej.","Panda červená sa živí výhradne hmyzom.","Panda červená žije v nížinných tropických lesoch."] },
  { name:"Japanese macaque", label:"Makak japonský", continent:"Ázia", sciName:"Macaca fuscata",
    fact:"Makak japonský je známy kúpaním sa v horúcich prameňoch počas zimných mesiacov.",
    falseFacts:["Makak japonský žije v tropických oblastiach a neznáša chlad.","Makak japonský je najväčší druh opice na svete.","Makak japonský žije samotársky v bambusových lesoch."] },
  { name:"Indian peafowl", label:"Páv korunkatý", continent:"Ázia", sciName:"Pavo cristatus",
    fact:"Samec páva korunkatého má nádherný vejárovitý chvost s očkovitými škvrnami, ktorým sa predvádza samiciam.",
    falseFacts:["Samice páva majú rovnako farebný chvost ako samce.","Páv korunkatý je výborný letec migrujúci na dlhé vzdialenosti.","Páv korunkatý je tichý vták, ktorý nevydáva žiadne zvuky."] },
  { name:"Binturong", label:"Binturong", continent:"Ázia", sciName:"Arctictis binturong",
    fact:"Binturong má chápavý chvost a jeho telo vonia po pražených kukuriciach alebo popcorne.",
    falseFacts:["Binturong je druh medveďa žijúci v juhovýchodnej Ázii.","Binturong je rýchly bežec loviaci korisť na zemi.","Binturong je jedovaté zviera nebezpečné pre ľudí."] },
  { name:"Sun bear", label:"Medveď malajský", continent:"Ázia", sciName:"Helarctos malayanus",
    fact:"Medveď malajský je najmenší druh medveďa na svete a má výrazne dlhý jazyk na zber medu.",
    falseFacts:["Medveď malajský hibernuje počas zimných mesiacov.","Medveď malajský je najväčší medveď v Ázii.","Medveď malajský sa živí výhradne rybami."] },
  { name:"Malayan tapir", label:"Tapír čabrakový", continent:"Ázia", sciName:"Tapirus indicus",
    fact:"Tapír čabrakový má výrazné čierno-biele sfarbenie, ktoré v noci pôsobí ako kamufláž.",
    falseFacts:["Tapír čabrakový je príbuzný koňom a nosorožcom.","Tapír čabrakový žije vo veľkých stádach.","Tapír čabrakový sa živí hlavne rybami a žabami."] },
  { name:"Gharial", label:"Gaviál indický", continent:"Ázia", sciName:"Gavialis gangeticus",
    fact:"Gaviál má úzku dlhú tlamu prispôsobenú na lov rýb a je jedným z najohrozenejších krokodílov.",
    falseFacts:["Gaviál indický je agresívny a často útočí na ľudí.","Gaviál indický žije na súši a do vody chodí len zriedka.","Gaviál indický loví veľkú korisť ako jelene a antilopy."] },
  { name:"Mandarin duck", label:"Kačica mandarínska", continent:"Ázia", sciName:"Aix galericulata",
    fact:"Kačica mandarínska je považovaná za jednu z najkrajších kačíc na svete vďaka farebnému opeřeniu samcov.",
    falseFacts:["Samce aj samice kačice mandarínskej sú rovnako farebné.","Kačica mandarínska žije výhradne na mori.","Kačica mandarínska je nelietavý vták."] },
  { name:"Siamang", label:"Siamang", continent:"Ázia", sciName:"Symphalangus syndactylus",
    fact:"Siamang je najväčší gibbon a má nafukovací hrdelný vak, ktorým zosilňuje svoj spev počuteľný na kilometre.",
    falseFacts:["Siamang trávi väčšinu času na zemi.","Siamang je tichý primát, ktorý komunikuje len gestami.","Siamang žije samotársky a nemá stály pár."] },
  { name:"Bactrian camel", label:"Ťava dvojhrbá", continent:"Ázia", sciName:"Camelus bactrianus",
    fact:"Ťava dvojhrbá má dva hrby, v ktorých ukladá tuk ako zásobu energie na dlhé pochody púšťou.",
    falseFacts:["Hrby ťavy dvojhrbej sú naplnené vodou.","Ťava dvojhrbá žije v tropických dažďových pralesoch.","Ťava dvojhrbá má jeden hrb na rozdiel od ťavy jednohrbej, ktorá má dva."] },
  { name:"Saiga antelope", label:"Sajga tatárska", continent:"Ázia", sciName:"Saiga tatarica",
    fact:"Sajga tatárska má výrazný nafukovací nos, ktorý filtruje prach v lete a zohrieva vzduch v zime.",
    falseFacts:["Sajga tatárska žije v tropických oblastiach Indie.","Sajga tatárska je veľká antilopa vážiaca viac ako 200 kg.","Sajga tatárska používa svoj nos na hľadanie potravy pod snehom."] },
  { name:"Markhor", label:"Kozorožec skrutkovitý", continent:"Ázia", sciName:"Capra falconeri",
    fact:"Kozorožec skrutkovitý má impozantné špirálovité rohy dlhé až 160 cm a je národným zvieraťom Pakistanu.",
    falseFacts:["Kozorožec skrutkovitý žije v nížinách a vyhýba sa horám.","Kozorožec skrutkovitý má krátke rovné rohy.","Kozorožec skrutkovitý je domestikované zviera ako domáca koza."] },
  { name:"Yak", label:"Jak domáci", continent:"Ázia", sciName:"Bos grunniens",
    fact:"Jak žije v nadmorských výškach nad 4 000 metrov a jeho hustá srsť ho chráni pred mrazmi do -40 °C.",
    falseFacts:["Jak žije v nížinách juhovýchodnej Ázie.","Jak je príbuzný koňom a patrí do čeľade koňovitých.","Jak má krátku riedku srsť prispôsobenú teplému podnebiu."] },
  { name:"Pallas's cat", label:"Manul", continent:"Ázia", sciName:"Otocolobus manul",
    fact:"Manul má najhustejšiu srsť spomedzi všetkých mačkovitých šeliem a okrúhle zorničky na rozdiel od ostatných mačiek.",
    falseFacts:["Manul je veľká mačka podobná veľkosti rysa.","Manul žije v tropických lesoch juhovýchodnej Ázie.","Manul je spoločenské zviera žijúce vo veľkých skupinách."] },
  { name:"Clouded leopard", label:"Leopard dymový", continent:"Ázia", sciName:"Neofelis nebulosa",
    fact:"Leopard dymový má najdlhšie očné zuby v pomere k veľkosti tela spomedzi všetkých mačkovitých šeliem.",
    falseFacts:["Leopard dymový je poddruh leoparda škvrnitého.","Leopard dymový žije na otvorených pláňach.","Leopard dymový nedokáže liezť po stromoch."] },
  { name:"Babirusa", label:"Babirusa", continent:"Ázia", sciName:"Babyrousa babyrussa",
    fact:"Babirusa je diviak z Indonézie, ktorého horné kly prerastajú cez kožu hornej čeľuste a zakrivia sa dozadu.",
    falseFacts:["Babirusa je druh antilopy žijúci v ázijských stepiach.","Babirusa nemá kly a vyzerá ako bežné prasa.","Babirusa žije na pevnine juhovýchodnej Ázie."] },
  { name:"Slow loris", label:"Outloň váhavý", continent:"Ázia", sciName:"Nycticebus coucang",
    fact:"Outloň váhavý je jeden z mála jedovatých cicavcov – na lakťoch má žľazy produkujúce toxín.",
    falseFacts:["Outloň váhavý je denné zviera aktívne počas dňa.","Outloň váhavý je rýchly primát skáčuci medzi stromami.","Outloň váhavý je úplne neškodný a nemá žiadnu obranu."] },
  { name:"Saltwater crocodile", label:"Krokodíl morský", continent:"Ázia", sciName:"Crocodylus porosus",
    fact:"Krokodíl morský je najväčší žijúci plaz na svete a môže dorásť do dĺžky 7 metrov.",
    falseFacts:["Krokodíl morský žije výhradne v sladkej vode riek.","Krokodíl morský je menší ako krokodíl nílsky.","Krokodíl morský sa živí prevažne rastlinami a riasami."] },
  { name:"Tarsier", label:"Nártoun", continent:"Ázia", sciName:"Tarsius tarsier",
    fact:"Nártoun má obrovské oči – každé oko je väčšie ako jeho mozog.",
    falseFacts:["Nártoun je denné zviera s veľmi malými očami.","Nártoun je druh opice žijúci v skupinách po 50 jedincov.","Nártoun sa živí výhradne ovocím a listami."] },
  { name:"Amur leopard", label:"Leopard amurský", continent:"Ázia", sciName:"Panthera pardus orientalis",
    fact:"Leopard amurský je najvzácnejšia veľká mačka na svete – v divočine žije len okolo 100 jedincov.",
    falseFacts:["Leopard amurský je bežný druh žijúci v celej Ázii.","Leopard amurský žije v tropických pralesoch.","Leopard amurský je väčší ako tiger bengálsky."] },
  { name:"Asian black bear", label:"Medveď ušatý", continent:"Ázia", sciName:"Ursus thibetanus",
    fact:"Medveď ušatý má na hrudi výraznú bielu alebo žltú škvrnu v tvare písmena V.",
    falseFacts:["Medveď ušatý je najväčší druh medveďa v Ázii.","Medveď ušatý nemá žiadne výrazné znaky na srsti.","Medveď ušatý sa živí výhradne mäsom."] },
  { name:"Dhole", label:"Dhoul", continent:"Ázia", sciName:"Cuon alpinus",
    fact:"Dhoul je ázijský divoký pes, ktorý loví vo svorkách a dokáže zahnať aj tigra od jeho koristi.",
    falseFacts:["Dhoul je samotársky lovec žijúci v pároch.","Dhoul je príbuzný hyenám a nie psom.","Dhoul sa živí výhradne malými hlodavcami."] },
  { name:"Fishing cat", label:"Mačka rybárska", continent:"Ázia", sciName:"Prionailurus viverrinus",
    fact:"Mačka rybárska loví ryby tak, že ich vytlápa labami z vody, a má čiastočne blanité prsty.",
    falseFacts:["Mačka rybárska sa bojí vody a nikdy do nej nevstupuje.","Mačka rybárska žije v suchých púšťach strednej Ázie.","Mačka rybárska je domestikovaný druh mačky."] },
  { name:"Dugong", label:"Dugong", continent:"Ázia", sciName:"Dugong dugon",
    fact:"Dugong je morský bylinožravec príbuzný slonovi a živí sa morskými trávami na plytčinách.",
    falseFacts:["Dugong je druh delfína.","Dugong žije v hlbokom oceáne ďaleko od pobrežia.","Dugong sa živí rybami a medúzami."] },
  { name:"Indian flying fox", label:"Kalôň indický", continent:"Ázia", sciName:"Pteropus giganteus",
    fact:"Kalôň indický má rozpätie krídel až 1,5 metra a je jedným z najväčších netopierov na svete.",
    falseFacts:["Kalôň indický sa orientuje pomocou echolokácie.","Kalôň indický sa živí hmyzom a komármi.","Kalôň indický žije v jaskyniach a nikdy nevychádza za svetla."] },
  { name:"Golden snub-nosed monkey", label:"Opica zlatá", continent:"Ázia", sciName:"Rhinopithecus roxellana",
    fact:"Opica zlatá žije v horských lesoch Číny vo výškach nad 3 000 metrov a znáša extrémne chlad.",
    falseFacts:["Opica zlatá žije v nížinných tropických lesoch.","Opica zlatá je samotársky primát.","Opica zlatá má tmavohnedú nenápadnú srsť."] },
  { name:"Tibetan fox", label:"Líška tibetská", continent:"Ázia", sciName:"Vulpes ferrilata",
    fact:"Líška tibetská má charakteristicky hranatú tvár so širokými lícami a žije na tibetskej náhornej plošine.",
    falseFacts:["Líška tibetská vyzerá rovnako ako líška hrdzavá.","Líška tibetská žije v lesoch pod Himalájami.","Líška tibetská je spoločenské zviera žijúce vo veľkých svorkách."] },
  { name:"Gaur", label:"Gaur", continent:"Ázia", sciName:"Bos gaurus",
    fact:"Gaur je najväčší divoký hovädzí dobytok na svete a samce môžu vážiť až 1 500 kg.",
    falseFacts:["Gaur je malé zviera podobné veľkosti kozy.","Gaur žije výhradne v močaristých oblastiach.","Gaur je domestikované zviera bežne chované na farmách."] },
  { name:"Chinese alligator", label:"Aligátor čínsky", continent:"Ázia", sciName:"Alligator sinensis",
    fact:"Aligátor čínsky je jeden z najmenších krokodílov na svete a žije len v povodí rieky Jang-c'-ťiang.",
    falseFacts:["Aligátor čínsky je najväčší krokodíl v Ázii.","Aligátor čínsky žije v celej juhovýchodnej Ázii.","Aligátor čínsky je morský druh žijúci v slanej vode."] },
  { name:"Reticulated python", label:"Pytón sieťkovaný", continent:"Ázia", sciName:"Malayopython reticulatus",
    fact:"Pytón sieťkovaný je najdlhší had na svete a môže dorásť do dĺžky 10 metrov.",
    falseFacts:["Pytón sieťkovaný je jedovatý had.","Pytón sieťkovaný je najťažší had na svete.","Pytón sieťkovaný žije výhradne vo vode."] },
  { name:"Javan rhinoceros", label:"Nosorožec jávsky", continent:"Ázia", sciName:"Rhinoceros sondaicus",
    fact:"Nosorožec jávsky je najvzácnejší veľký cicavec na svete – prežíva len asi 70 jedincov na Jáve.",
    falseFacts:["Nosorožec jávsky je bežný druh žijúci v celej Ázii.","Nosorožec jávsky má dva veľké rohy.","Nosorožec jávsky žije v otvorených trávnatých pláňach."] },
  { name:"Lar gibbon", label:"Gibon bielolíci", continent:"Ázia", sciName:"Hylobates lar",
    fact:"Gibon bielolíci sa pohybuje houpavým letom medzi konármi rýchlosťou až 55 km/h – hovorí sa tomu brachiácia.",
    falseFacts:["Gibon bielolíci chodí po zemi na štyri nohy.","Gibon bielolíci je najväčší ľudoop.","Gibon bielolíci žije samotársky a nekomunikuje s ostatnými gibonmi."] },
  { name:"Sumatran tiger", label:"Tiger sumatriansky", continent:"Ázia", sciName:"Panthera tigris sumatrae",
    fact:"Tiger sumatriansky je najmenší poddruh tigra a žije len na ostrove Sumatra v Indonézii.",
    falseFacts:["Tiger sumatriansky je najväčší poddruh tigra.","Tiger sumatriansky žije na niekoľkých ostrovoch juhovýchodnej Ázie.","Tiger sumatriansky má svetlú srsť bez výrazných pruhov."] },
  { name:"Asian water buffalo", label:"Byvol vodný", continent:"Ázia", sciName:"Bubalus bubalis",
    fact:"Byvol vodný trávi veľkú časť dňa ponorený vo vode alebo bahne, čo ho chráni pred parazitmi a horúčavou.",
    falseFacts:["Byvol vodný sa vyhýba vode a žije v suchých oblastiach.","Byvol vodný nikdy nebol domestikovaný.","Byvol vodný je príbuzný byvolom africkým."] },
  { name:"Bali myna", label:"Škorec balijský", continent:"Ázia", sciName:"Leucopsar rothschildi",
    fact:"Škorec balijský je kriticky ohrozený vták žijúci len na ostrove Bali s menej ako 100 jedincami v divočine.",
    falseFacts:["Škorec balijský je bežný vták rozšírený v celej Ázii.","Škorec balijský má tmavé nenápadné sfarbenie.","Škorec balijský je dravý vták."] },
  { name:"Sunda pangolin", label:"Luskáň malajský", continent:"Ázia", sciName:"Manis javanica",
    fact:"Luskáň malajský je jedno z najčastejšie pašovaných zvierat na svete kvôli jeho šupinám.",
    falseFacts:["Luskáň malajský je bežné a hojné zviera.","Luskáň malajský sa bráni jedovými zubami.","Luskáň malajský sa živí ovocím a listami."] },
  { name:"Indian star tortoise", label:"Korytnačka hviezdnatá", continent:"Ázia", sciName:"Geochelone elegans",
    fact:"Korytnačka hviezdnatá má výrazný hviezdovitý vzor na pancieri, ktorý slúži ako kamufláž v tráve.",
    falseFacts:["Korytnačka hviezdnatá žije vo vode ako vodná korytnačka.","Korytnačka hviezdnatá je najväčšia suchozemská korytnačka v Ázii.","Korytnačka hviezdnatá má hladký jednoliatý pancier bez vzoru."] },
  { name:"Himalayan tahr", label:"Tahr himalájsky", continent:"Ázia", sciName:"Hemitragus jemlahicus",
    fact:"Tahr himalájsky je horská koza žijúca v strmých skalnatých svahoch Himalájí vo výškach nad 4 000 metrov.",
    falseFacts:["Tahr himalájsky žije v nížinách Indie.","Tahr himalájsky je príbuzný jeleňom.","Tahr himalájsky je samotárske zviera vyhýbajúce sa stádam."] },
  { name:"Irrawaddy dolphin", label:"Delfín irávatský", continent:"Ázia", sciName:"Orcaella brevirostris",
    fact:"Delfín irávatský má zaoblený čelo bez výrazného zobáka a žije v riekach a pobrežných vodách juhovýchodnej Ázie.",
    falseFacts:["Delfín irávatský žije výhradne v otvorenom oceáne.","Delfín irávatský je najväčší druh delfína na svete.","Delfín irávatský má dlhý zobák ako väčšina delfínov."] },
  { name:"Tibetan antelope", label:"Čírú", continent:"Ázia", sciName:"Pantholops hodgsonii",
    fact:"Čírú je antilopa žijúca na tibetskej plošine, ktorej jemná vlna je najtenšia spomedzi všetkých zvierat.",
    falseFacts:["Čírú žije v tropických oblastiach Indie.","Čírú má hrubú srsť nevhodnú na textilnú výrobu.","Čírú je veľká antilopa vážiaca viac ako 200 kg."] },
  { name:"Kiang", label:"Kiang", continent:"Ázia", sciName:"Equus kiang",
    fact:"Kiang je najväčší druh divokého osla na svete a žije na tibetskej náhornej plošine.",
    falseFacts:["Kiang je druh zebry žijúci v Ázii.","Kiang žije v nížinných pralesoch.","Kiang je najmenší zástupca čeľade koňovitých."] },
  { name:"Flying lemur", label:"Letucha", continent:"Ázia", sciName:"Galeopterus variegatus",
    fact:"Letucha v skutočnosti nelieta – kĺže vzduchom pomocou kožnej blany rozprestretej medzi končatinami na vzdialenosť až 70 metrov.",
    falseFacts:["Letucha je druh lemura žijúci na Madagaskare.","Letucha dokáže aktívne lietať mávajúc blanou ako krídlami.","Letucha žije na zemi a nelieze po stromoch."] },
  { name:"Draco lizard", label:"Jašterica lietajúca", continent:"Ázia", sciName:"Draco volans",
    fact:"Jašterica lietajúca má predĺžené rebrá pokryté kožnou blanou, vďaka ktorej kĺže medzi stromami.",
    falseFacts:["Jašterica lietajúca skutočne lieta mávaním krídlami.","Jašterica lietajúca je veľký jašter dlhý až 1 meter.","Jašterica lietajúca žije na zemi v púštnych oblastiach."] },
  { name:"Pig-tailed macaque", label:"Makak veprovitý", continent:"Ázia", sciName:"Macaca nemestrina",
    fact:"Makak veprovitý má krátky chvost zakrútený ako prasací a v Thajsku bol cvičený na zber kokosových orechov.",
    falseFacts:["Makak veprovitý nemá chvost.","Makak veprovitý žije výhradne na zemi.","Makak veprovitý je samotárske zviera."] },
  { name:"Indian python", label:"Pytón indicý", continent:"Ázia", sciName:"Python molurus",
    fact:"Pytón indický dokáže prehĺtať korisť väčšiu ako je jeho hlava vďaka pružným čeľustiam.",
    falseFacts:["Pytón indický je jedovatý had.","Pytón indický žije výhradne vo vode.","Pytón indický je malý had dlhý maximálne 1 meter."] },
  { name:"Sumatran rhinoceros", label:"Nosorožec sumatriansky", continent:"Ázia", sciName:"Dicerorhinus sumatrensis",
    fact:"Nosorožec sumatriansky je najmenší a najchlpatejší druh nosorožca a je kriticky ohrozený.",
    falseFacts:["Nosorožec sumatriansky je najväčší nosorožec v Ázii.","Nosorožec sumatriansky má hladkú kožu bez srsti.","Nosorožec sumatriansky žije v savanách ako africké druhy."] },
  { name:"Asian small-clawed otter", label:"Vydra malá", continent:"Ázia", sciName:"Aonyx cinereus",
    fact:"Vydra malá je najmenší druh vydry na svete a má čiastočne vyvinuté blany medzi prstami.",
    falseFacts:["Vydra malá je najväčšia vydra v Ázii.","Vydra malá žije samotársky.","Vydra malá sa živí výhradne rybami."] }

  // ═══════════════════════════════════════
  //  EURÓPA
  // ═══════════════════════════════════════
  { name:"Brown bear", label:"Medveď hnedý", continent:["Európa","Ázia"], sciName:"Ursus arctos",
    fact:"Medveď hnedý je najväčšia európska šelma a počas zimného spánku môže stratiť až tretinu svojej hmotnosti.",
    falseFacts:["Medveď hnedý je výhradne mäsožravec.","Medveď hnedý počas zimy nespí a je aktívny celoročne.","Medveď hnedý žije len v Ázii a v Európe sa už nevyskytuje."] },
  { name:"European bison", label:"Zubor európsky", continent:"Európa", sciName:"Bison bonasus",
    fact:"Zubor európsky je najväčšie suchozemské zviera v Európe a začiatkom 20. storočia bol takmer vyhubený.",
    falseFacts:["Zubor európsky žije v otvorených stepiach.","Zubor európsky je domestikované zviera chované na mäso.","Zubor európsky je poddruh amerického bizóna."] },
  { name:"Grey wolf", label:"Vlk dravý", continent:["Európa","Ázia"], sciName:"Canis lupus",
    fact:"Vlk dravý žije vo svorkách s prísnou hierarchiou a dokáže komunikovať zavýjaním na vzdialenosť až 15 km.",
    falseFacts:["Vlk dravý je samotársky lovec, ktorý nikdy netvorí svorky.","Vlk dravý sa živí prevažne rastlinnou potravou.","Vlk dravý je predkom mačky domácej."] },
  { name:"Eurasian lynx", label:"Rys ostrovid", continent:"Európa", sciName:"Lynx lynx",
    fact:"Rys ostrovid je najväčšia európska mačkovitá šelma a loví hlavne srnce a zajace.",
    falseFacts:["Rys ostrovid žije vo svorkách ako vlky.","Rys ostrovid nemá štetinky na ušiach.","Rys ostrovid je najmenšia mačkovitá šelma v Európe."] },
  { name:"Wild boar", label:"Diviak lesný", continent:"Európa", sciName:"Sus scrofa",
    fact:"Diviak lesný je predkom domáceho prasaťa a je jedným z najrozšírenejších veľkých cicavcov na svete.",
    falseFacts:["Diviak lesný sa živí výhradne žaluďami a bukviami.","Diviak lesný je samotárske zviera, ktoré netvori skupiny.","Diviak lesný žije len v lesoch a nikdy nevchádza na polia."] },
  { name:"Red fox", label:"Líška hrdzavá", continent:"Európa", sciName:"Vulpes vulpes",
    fact:"Líška hrdzavá je najrozšírenejší divoký mäsožravec na svete a žije na všetkých kontinentoch okrem Antarktídy.",
    falseFacts:["Líška hrdzavá žije výhradne v Európe.","Líška hrdzavá žije vo svorkách ako vlky.","Líška hrdzavá je bylinožravec živiaci sa bobulami a ovocím."] },
  { name:"Roe deer", label:"Srnec hôrny", continent:"Európa", sciName:"Capreolus capreolus",
    fact:"Srnec hôrny je najmenší európsky jeleňovitý a samce zhadzujú parožie každý rok na jeseň.",
    falseFacts:["Srnec hôrny má parožie celoročne.","Samice srnca hôrneho majú rovnaké parožie ako samce.","Srnec hôrny je nočné zviera, ktoré nikdy nevychádza za svetla."] },
  { name:"European beaver", label:"Bobor vodný", continent:"Európa", sciName:"Castor fiber",
    fact:"Bobor vodný stavia hrádze z konárov a bahna, ktoré vytvárajú jazerá a menia celý ekosystém.",
    falseFacts:["Bobor vodný žije v norách a nestaví hrádze.","Bobor vodný sa živí rybami.","Bobor vodný žije samotársky a nemá rodinnú štruktúru."] },
  { name:"White stork", label:"Bocian biely", continent:"Európa", sciName:"Ciconia ciconia",
    fact:"Bocian biely hniezdí na komínoch a stĺpoch blízko ľudských obydlí a každý rok sa vracia do rovnakého hniezda.",
    falseFacts:["Bocian biely hniezdí v korunách vysokých stromov v hlbokých lesoch.","Bocian biely je stály vták, ktorý nemigruje.","Bocian biely sa živí výhradne rybami."] },
  { name:"Barn owl", label:"Plamienka driemavá", continent:"Európa", sciName:"Tyto alba",
    fact:"Plamienka driemavá má tvár v tvare srdca a dokáže loviť v úplnej tme len podľa zvuku.",
    falseFacts:["Plamienka driemavá loví výhradne za denného svetla.","Plamienka driemavá sa živí ovocím a semenami.","Plamienka driemavá je najväčšia sova v Európe."] },
  { name:"Eurasian eagle-owl", label:"Výr skalný", continent:"Európa", sciName:"Bubo bubo",
    fact:"Výr skalný je najväčšia európska sova s rozpätím krídel až 188 cm.",
    falseFacts:["Výr skalný je malá sova veľkosti holuba.","Výr skalný je denný dravec.","Výr skalný sa živí výhradne hmyzom."] },
  { name:"Atlantic puffin", label:"Papuchalk severský", continent:"Európa", sciName:"Fratercula arctica",
    fact:"Papuchalk severský dokáže v zobáku preniesť naraz aj 10-20 rybičiek usporiadaných vedľa seba.",
    falseFacts:["Papuchalk severský je nelietavý vták.","Papuchalk severský žije v tropických oblastiach.","Papuchalk severský hniezdí na stromoch."] },
  { name:"Dalmatian pelican", label:"Pelikán kučeravý", continent:"Európa", sciName:"Pelecanus crispus",
    fact:"Pelikán kučeravý je najväčší európsky vodný vták s rozpätím krídel až 3,5 metra.",
    falseFacts:["Pelikán kučeravý je malý vták veľkosti kačice.","Pelikán kučeravý sa potápa pod vodu ako kormorán.","Pelikán kučeravý sa živí výhradne vodným hmyzom."] },
  { name:"European hedgehog", label:"Jež západný", continent:"Európa", sciName:"Erinaceus europaeus",
    fact:"Jež západný sa pri nebezpečenstve stočí do klbka a nastráži asi 5 000 ostňov na obranu.",
    falseFacts:["Jež západný dokáže vystreľovať ostne na predátorov.","Jež západný je aktívny cez deň a spí v noci.","Jež západný sa živí výhradne ovocím a zeleninou."] },
  { name:"Alpine ibex", label:"Kozorožec alpský", continent:"Európa", sciName:"Capra ibex",
    fact:"Kozorožec alpský dokáže liezť po takmer zvislých skalných stenách vďaka špeciálne prispôsobeným kopytám.",
    falseFacts:["Kozorožec alpský žije v nížinných lúkach.","Kozorožec alpský má krátke rovné rohy.","Kozorožec alpský je domestikované zviera príbuzné domácej koze."] },
  { name:"Chamois", label:"Kamzík vrchovský", continent:"Európa", sciName:"Rupicapra rupicapra",
    fact:"Kamzík vrchovský dokáže skákať medzi skalnými výstupkami a je symbolom vysokohorskej prírody Álp a Tatier.",
    falseFacts:["Kamzík vrchovský žije v nížinných lesoch.","Kamzík vrchovský je veľké zviera vážiace viac ako 150 kg.","Kamzík vrchovský nemá rohy."] },
  { name:"European otter", label:"Vydra riečna", continent:"Európa", sciName:"Lutra lutra",
    fact:"Vydra riečna je výborný plavec a dokáže zadržať dych pod vodou až 8 minút.",
    falseFacts:["Vydra riečna žije výhradne na súši.","Vydra riečna je pomalý plavec, ktorý sa bojí hlbokej vody.","Vydra riečna sa živí rastlinami rastúcimi pri vode."] },
  { name:"Wolverine", label:"Rosomák sivobledý", continent:["Severná Amerika","Európa"], sciName:"Gulo gulo",
    fact:"Rosomák sivobledý je najväčší suchozemský zástupca čeľade lasicovitých a je známy svojou neuveriteľnou silou.",
    falseFacts:["Rosomák sivobledý je príbuzný medveďom.","Rosomák sivobledý je plachý a slabý predátor.","Rosomák sivobledý žije v tropických lesoch."] },
  { name:"European mink", label:"Norok európsky", continent:"Európa", sciName:"Mustela lutreola",
    fact:"Norok európsky je kriticky ohrozený druh a takmer vyhynul kvôli konkurencii s inváznym norkom americkým.",
    falseFacts:["Norok európsky je bežné a hojné zviera v celej Európe.","Norok európsky sa živí rybami a nikdy neopúšťa vodu.","Norok európsky je rovnaký druh ako norok americký."] },
  { name:"Mouflon", label:"Muflón", continent:"Európa", sciName:"Ovis gmelini",
    fact:"Muflón je predkom domácej ovce a pôvodne pochádza z ostrovov Korzika a Sardínia.",
    falseFacts:["Muflón pochádza zo Severnej Ameriky.","Muflón nemá rohy – ani samce, ani samice.","Muflón je domestikované zviera chované na vlnu."] },
  { name:"Red deer", label:"Jeleň lesný", continent:"Európa", sciName:"Cervus elaphus",
    fact:"Jeleň lesný je jeden z najväčších jeleňov v Európe a samce sa na jeseň ozývajú mohutným revom počas ruje.",
    falseFacts:["Jeleň lesný má parožie celoročne a nikdy ho nezhadzuje.","Samice jeleňa lesného majú parožie rovnako ako samce.","Jeleň lesný žije samotársky a netvorí stáda."] },
  { name:"Fallow deer", label:"Daniel škvrnitý", continent:"Európa", sciName:"Dama dama",
    fact:"Daniel škvrnitý má charakteristické lopatkovité parožie a biele škvrny na srsti.",
    falseFacts:["Daniel škvrnitý má špicaté parožie ako jeleň lesný.","Daniel škvrnitý stráca škvrny v dospelosti.","Daniel škvrnitý je pôvodný druh v Severnej Amerike."] },
  { name:"Reindeer", label:"Sob polárny", continent:["Európa","Severná Amerika"], sciName:"Rangifer tarandus",
    fact:"Sob polárny je jediný jeleňovitý, u ktorého majú parožie aj samice.",
    falseFacts:["Sob polárny žije v teplých oblastiach Európy.","Parožie majú výhradne samce soba.","Sob polárny sa živí hlavne mäsom a rybami."] },
  { name:"Arctic fox", label:"Líška polárna", continent:["Európa","Severná Amerika"], sciName:"Vulpes lagopus",
    fact:"Líška polárna mení farbu srsti – v zime je biela a v lete šedohnedá.",
    falseFacts:["Líška polárna má bielu srsť celoročne.","Líška polárna žije v lesoch južnej Európy.","Líška polárna je väčšia ako líška hrdzavá."] },
  { name:"Golden eagle", label:"Orol skalný", continent:"Európa", sciName:"Aquila chrysaetos",
    fact:"Orol skalný je jeden z najsilnejších dravcov a dokáže sa vrhnúť na korisť rýchlosťou cez 300 km/h.",
    falseFacts:["Orol skalný sa živí výhradne rybami.","Orol skalný je najmenší európsky dravec.","Orol skalný hniezdi na zemi v tráve."] },
  { name:"White-tailed eagle", label:"Orliak morský", continent:"Európa", sciName:"Haliaeetus albicilla",
    fact:"Orliak morský má rozpätie krídel až 2,4 metra a je najväčším dravým vtákom v Európe.",
    falseFacts:["Orliak morský je menší ako myšiak hôrny.","Orliak morský žije výhradne na mori a nehniezdí na súši.","Orliak morský sa živí ovocím a zrnom."] },
  { name:"Peregrine falcon", label:"Sokol sťahovavý", continent:"Európa", sciName:"Falco peregrinus",
    fact:"Sokol sťahovavý je najrýchlejšie zviera na svete – pri strmhlavom lete dosahuje rýchlosť cez 380 km/h.",
    falseFacts:["Sokol sťahovavý je pomalý letec loviaci z postriežky.","Sokol sťahovavý žije výhradne v arktických oblastiach.","Sokol sťahovavý sa živí výhradne hmyzom."] },
  { name:"Common kingfisher", label:"Rybárik riečny", continent:"Európa", sciName:"Alcedo atthis",
    fact:"Rybárik riečny sa strmhlav potápa do vody a loví ryby, pričom jeho farebné perie je výsledkom lomu svetla, nie pigmentov.",
    falseFacts:["Rybárik riečny loví ryby brodením sa vo vode.","Rybárik riečny je veľký vták veľkosti vrany.","Rybárik riečny je nelietavý vták žijúci na brehu."] },
  { name:"Hoopoe", label:"Dudok chochlatý", continent:"Európa", sciName:"Upupa epops",
    fact:"Dudok chochlatý má výrazný chochol, ktorý roztvára do vejára, a na obranu hniezda produkuje zapáchajúci sekrét.",
    falseFacts:["Dudok chochlatý je vodný vták žijúci pri jazerách.","Dudok chochlatý nemá žiadne nápadné sfarbenie.","Dudok chochlatý žije výhradne v tropických oblastiach."] },
  { name:"Common crane", label:"Žeriav popolavý", continent:"Európa", sciName:"Grus grus",
    fact:"Žeriav popolavý je známy svojimi pôsobivými svadobnými tancami, pri ktorých páriky skáču a točia sa.",
    falseFacts:["Žeriav popolavý je nelietavý vták.","Žeriav popolavý žije samotársky a netvorí páry.","Žeriav popolavý sa živí výhradne rybami."] },
  { name:"European badger", label:"Jazvec lesný", continent:"Európa", sciName:"Meles meles",
    fact:"Jazvec lesný žije v podzemných norách zvaných hradby, ktoré môže používať viacero generácií.",
    falseFacts:["Jazvec lesný žije na stromoch.","Jazvec lesný je samotárske zviera, ktoré nikdy nezdieľa noru.","Jazvec lesný sa živí výhradne mäsom."] },
  { name:"European polecat", label:"Tchor tmavý", continent:"Európa", sciName:"Mustela putorius",
    fact:"Tchor tmavý je predkom domáceho fretky a pri nebezpečenstve vypúšťa zapáchajúci sekrét z análnych žliaz.",
    falseFacts:["Tchor tmavý je príbuzný mačkám.","Tchor tmavý nemá žiadny obranný mechanizmus.","Tchor tmavý žije vo vode ako vydra."] },
  { name:"Common kestrel", label:"Sokol myšiar", continent:"Európa", sciName:"Falco tinnunculus",
    fact:"Sokol myšiar dokáže visieť nehybne vo vzduchu – triepotať krídlami na jednom mieste počas lovu hlodavcov.",
    falseFacts:["Sokol myšiar loví výhradne ryby.","Sokol myšiar je najväčší európsky dravec.","Sokol myšiar nedokáže lietať a loví len zo zeme."] },
  { name:"Black stork", label:"Bocian čierny", continent:"Európa", sciName:"Ciconia nigra",
    fact:"Bocian čierny je plachý lesný vták, na rozdiel od bocianu bieleho sa vyhýba ľudským sídlam.",
    falseFacts:["Bocian čierny hniezdí na strechách domov.","Bocian čierny je stály vták, ktorý nemigruje.","Bocian čierny sa živí výhradne žabami."] },
  { name:"Great grey owl", label:"Sova dlhochvostá", continent:"Európa", sciName:"Strix nebulosa",
    fact:"Sova dlhochvostá je jedna z najväčších sov na svete a dokáže zachytiť korisť pod snehom len podľa sluchu.",
    falseFacts:["Sova dlhochvostá je malá sova veľkosti pästi.","Sova dlhochvostá loví výhradne za denného svetla.","Sova dlhochvostá žije v teplých oblastiach južnej Európy."] },
  { name:"Eurasian spoonbill", label:"Lyžičiar biely", continent:"Európa", sciName:"Platalea leucorodia",
    fact:"Lyžičiar biely má zobák v tvare lyžice, ktorým cedí vodu a filtruje drobnú korisť.",
    falseFacts:["Lyžičiar biely má dlhý rovný zobák ako bocian.","Lyžičiar biely sa živí výhradne rybami.","Lyžičiar biely je dravý vták loviaci hlodavce."] },
  { name:"Stone marten", label:"Kuna skalná", continent:"Európa", sciName:"Martes foina",
    fact:"Kuna skalná žije často v blízkosti ľudí a je známa tým, že prehryzie káble v motorových vozidlách.",
    falseFacts:["Kuna skalná žije výhradne v hlbokých lesoch ďaleko od ľudí.","Kuna skalná je bylinožravec.","Kuna skalná je vodné zviera príbuzné vydre."] },
  { name:"European bee-eater", label:"Včelárik zlatý", continent:"Európa", sciName:"Merops apiaster",
    fact:"Včelárik zlatý chytá hmyz za letu a pred zjedením včely či osy jej opatrne vytrie žihadlo o konár.",
    falseFacts:["Včelárik zlatý sa živí výhradne nektárom kvetov.","Včelárik zlatý je nenápadný hnedý vták.","Včelárik zlatý žije celoročne v severnej Európe."] },
  { name:"European ground squirrel", label:"Syseľ pasienkový", continent:"Európa", sciName:"Spermophilus citellus",
    fact:"Syseľ pasienkový žije v kolóniách v podzemných norách a pred nebezpečenstvom varuje ostatných ostrým piskotom.",
    falseFacts:["Syseľ pasienkový žije na stromoch ako veverica.","Syseľ pasienkový je aktívny celý rok a nehibernuje.","Syseľ pasienkový sa živí hmyzom a drobnými živočíchmi."] }

  // ═══════════════════════════════════════
  //  SEVERNÁ AMERIKA
  // ═══════════════════════════════════════
  { name:"American bison", label:"Bizón americký", continent:"Severná Amerika", sciName:"Bison bison",
    fact:"Bizón americký je najväčšie suchozemské zviera Severnej Ameriky a kedysi sa po prérii túlali desiatky miliónov kusov.",
    falseFacts:["Bizón americký je poddruh zubra európskeho.","Bizón americký žije v lesoch a vyhýba sa otvoreným pláňam.","Bizón americký je domestikované zviera chované na mlieko."] },
  { name:"Grizzly bear", label:"Medveď grizly", continent:"Severná Amerika", sciName:"Ursus arctos horribilis",
    fact:"Medveď grizly dokáže bežať rýchlosťou až 55 km/h a na jeseň zje denne až 40 kg potravy pred zimným spánkom.",
    falseFacts:["Medveď grizly je výhradne bylinožravý.","Medveď grizly je malý medveď vážiaci menej ako 100 kg.","Medveď grizly žije v tropických pralesoch."] },
  { name:"Polar bear", label:"Medveď biely", continent:"Severná Amerika", sciName:"Ursus maritimus",
    fact:"Medveď biely má v skutočnosti čiernu kožu a priehľadnú srsť, ktorá len vyzerá bielo.",
    falseFacts:["Medveď biely má bielu kožu pod bielou srsťou.","Medveď biely žije na Antarktíde.","Medveď biely sa živí výhradne rybami."] },
  { name:"Bald eagle", label:"Orol bielohlavý", continent:"Severná Amerika", sciName:"Haliaeetus leucocephalus",
    fact:"Orol bielohlavý je národným symbolom USA a stavia obrovské hniezda vážiace aj viac ako tonu.",
    falseFacts:["Orol bielohlavý je malý dravec veľkosti jastraba.","Orol bielohlavý je plešatý – nemá perie na hlave.","Orol bielohlavý sa živí výhradne haďmi."] },
  { name:"Mountain lion", label:"Puma americká", continent:"Severná Amerika", sciName:"Puma concolor",
    fact:"Puma americká má najväčší areál rozšírenia spomedzi všetkých veľkých suchozemských cicavcov v Amerike.",
    falseFacts:["Puma americká vie revať ako lev.","Puma americká žije výhradne v horách.","Puma americká je poddruh afrického leva."] },
  { name:"Gray wolf", label:"Vlk sivý", continent:"Severná Amerika", sciName:"Canis lupus",
    fact:"Vlk sivý bol takmer vyhubený v USA, ale úspešne ho reintrodukovali v Yellowstonskom národnom parku.",
    falseFacts:["Vlk sivý žije výhradne v Ázii.","Vlk sivý je samotársky lovec, ktorý nikdy netvorí svorky.","Vlk sivý sa živí výhradne bobulami a koreňmi."] },
  { name:"Moose", label:"Los mokraďový", continent:"Severná Amerika", sciName:"Alces alces",
    fact:"Los mokraďový je najväčší jeleňovitý na svete – samce môžu vážiť až 700 kg a mať parožie široké 1,8 metra.",
    falseFacts:["Los mokraďový je malý jeleň veľkosti srnca.","Los mokraďový žije v teplých oblastiach Mexika.","Los mokraďový nemá parožie."] },
  { name:"Elk", label:"Wapiti", continent:"Severná Amerika", sciName:"Cervus canadensis",
    fact:"Wapiti je druhý najväčší jeleňovitý na svete a samce sú známe svojím prenikavým trúbením počas ruje.",
    falseFacts:["Wapiti je najmenší jeleňovitý v Severnej Amerike.","Wapiti žije výhradne v tropických lesoch.","Wapiti je iný názov pre losa."] },
  { name:"White-tailed deer", label:"Jeleň bielochvostý", continent:"Severná Amerika", sciName:"Odocoileus virginianus",
    fact:"Jeleň bielochvostý pri úteku zdvíha biely chvost ako varovný signál pre ostatných členov stáda.",
    falseFacts:["Jeleň bielochvostý má biely chvost len v zime.","Jeleň bielochvostý je kriticky ohrozený druh.","Jeleň bielochvostý žije výhradne v horách."] },
  { name:"Pronghorn", label:"Vidloroh americký", continent:"Severná Amerika", sciName:"Antilocapra americana",
    fact:"Vidloroh americký je najrýchlejšie suchozemské zviera Severnej Ameriky a dokáže bežať rýchlosťou až 88 km/h.",
    falseFacts:["Vidloroh americký je druh antilopy príbuzný africkým antilopám.","Vidloroh americký je pomalé zviera.","Vidloroh americký žije v hustých lesoch."] },
  { name:"Raccoon", label:"Medvedík čistotný", continent:"Severná Amerika", sciName:"Procyon lotor",
    fact:"Medvedík čistotný má mimoriadne citlivé predné labky a pred jedením si často „umýva" potravu vo vode.",
    falseFacts:["Medvedík čistotný je príbuzný medveďom.","Medvedík čistotný nemá masku na tvári.","Medvedík čistotný sa živí výhradne rybami."] },
  { name:"Striped skunk", label:"Skunk pruhovaný", continent:"Severná Amerika", sciName:"Mephitis mephitis",
    fact:"Skunk pruhovaný dokáže vystreliť zapáchajúcu tekutinu z análnych žliaz presne na vzdialenosť až 5 metrov.",
    falseFacts:["Skunk pruhovaný je bez zápachu a je obľúbeným domácim zvieraťom.","Skunk pruhovaný je príbuzný mačkám.","Skunk pruhovaný žije výhradne v tropických pralesoch."] },
  { name:"North American beaver", label:"Bobor kanadský", continent:"Severná Amerika", sciName:"Castor canadensis",
    fact:"Bobor kanadský je najväčší hlodavec Severnej Ameriky a stavia hrádze dlhé aj stovky metrov.",
    falseFacts:["Bobor kanadský žije v norách a nestaví hrádze.","Bobor kanadský sa živí rybami.","Bobor kanadský je menší ako potkan."] },
  { name:"North American porcupine", label:"Dikobraz stromový", continent:"Severná Amerika", sciName:"Erethizon dorsatum",
    fact:"Dikobraz stromový má asi 30 000 ostňov s drobnými háčikmi na konci, ktoré sťažujú ich vytiahnutie z kože útočníka.",
    falseFacts:["Dikobraz stromový vystreľuje ostne na predátorov.","Dikobraz stromový žije na zemi a nikdy neliezie na stromy.","Dikobraz stromový je príbuzný ježovi."] },
  { name:"American black bear", label:"Medveď baribal", continent:"Severná Amerika", sciName:"Ursus americanus",
    fact:"Medveď baribal je najrozšírenejší medveď v Severnej Amerike a nie vždy je čierny – môže byť hnedý, blond či dokonca biely.",
    falseFacts:["Medveď baribal je vždy čiernej farby.","Medveď baribal je väčší ako medveď grizly.","Medveď baribal sa živí výhradne medom."] },
  { name:"Bobcat", label:"Rys červený", continent:"Severná Amerika", sciName:"Lynx rufus",
    fact:"Rys červený je najrozšírenejšia divoká mačka v Severnej Amerike a žije od Kanady až po Mexiko.",
    falseFacts:["Rys červený žije výhradne v Kanade.","Rys červený je veľký ako leopard.","Rys červený sa živí výhradne rybami."] },
  { name:"Canada lynx", label:"Rys kanadský", continent:"Severná Amerika", sciName:"Lynx canadensis",
    fact:"Rys kanadský má obrovské chlpaté labky, ktoré fungujú ako snežnice a umožňujú mu pohybovať sa po snehu.",
    falseFacts:["Rys kanadský žije v púšťach na juhu USA.","Rys kanadský má malé labky ako domáca mačka.","Rys kanadský loví veľkú zver ako losy."] },
  { name:"Coyote", label:"Kojot prérijný", continent:"Severná Amerika", sciName:"Canis latrans",
    fact:"Kojot prérijný je mimoriadne prispôsobivý a dokázal rozšíriť svoj areál napriek urbanizácii – žije aj v mestách.",
    falseFacts:["Kojot prérijný žije výhradne v divočine ďaleko od miest.","Kojot prérijný je väčší ako vlk.","Kojot prérijný sa živí výhradne mršinami."] },
  { name:"American alligator", label:"Aligátor mississippský", continent:"Severná Amerika", sciName:"Alligator mississippiensis",
    fact:"Aligátor mississippský prežil 65 miliónov rokov takmer nezmenený a samice strážia hniezda a pomáhajú mláďatám do vody.",
    falseFacts:["Aligátor mississippský žije v slanej morskej vode.","Aligátor mississippský je rovnaký druh ako krokodíl nílsky.","Aligátor mississippský sa živí výhradne rybami."] },
  { name:"Gila monster", label:"Jedovatec hrubochvostý", continent:"Severná Amerika", sciName:"Heloderma suspectum",
    fact:"Jedovatec hrubochvostý je jeden z mála jedovatých jašterov na svete a jed vpravuje žuvaním, nie uhryznutím.",
    falseFacts:["Jedovatec hrubochvostý je nejedovatý jašter.","Jedovatec hrubochvostý strieká jed zo zubov ako kobra.","Jedovatec hrubochvostý žije vo vode."] },
  { name:"Rattlesnake", label:"Chrastiakovec", continent:"Severná Amerika", sciName:"Crotalus spp.",
    fact:"Chrastiakovec má na konci chvosta hrkálku z keratínových segmentov, ktorou varuje pred nebezpečenstvom.",
    falseFacts:["Chrastiakovec je nejedovatý had.","Chrastiakovec používa hrkálku na lákanie koristi.","Chrastiakovec žije výhradne vo vode."] },
  { name:"California condor", label:"Kondor kalifornský", continent:"Severná Amerika", sciName:"Gymnogyps californianus",
    fact:"Kondor kalifornský má rozpätie krídel cez 2,7 metra a bol zachránený pred vyhynutím, keď zostalo len 22 jedincov.",
    falseFacts:["Kondor kalifornský je malý dravec veľkosti jastraba.","Kondor kalifornský je bežný a hojný vták.","Kondor kalifornský loví živú korisť."] },
  { name:"Wild turkey", label:"Moriak divý", continent:"Severná Amerika", sciName:"Meleagris gallopavo",
    fact:"Moriak divý je predkom domáceho moriaka a dokáže lietať krátke vzdialenosti rýchlosťou až 88 km/h.",
    falseFacts:["Moriak divý nedokáže lietať.","Moriak divý pochádza z Turecka.","Moriak divý je vodný vták žijúci pri jazerách."] },
  { name:"Roadrunner", label:"Kukučka zemnobežná", continent:"Severná Amerika", sciName:"Geococcyx californianus",
    fact:"Kukučka zemnobežná beží rýchlosťou až 32 km/h a loví hady a jašterice na zemi.",
    falseFacts:["Kukučka zemnobežná je výborný letec, ktorý sa zriedka dotýka zeme.","Kukučka zemnobežná sa živí výhradne semenami.","Kukučka zemnobežná žije v hustých tropických pralesoch."] },
  { name:"American bullfrog", label:"Žaba volská", continent:"Severná Amerika", sciName:"Lithobates catesbeianus",
    fact:"Žaba volská je najväčšia žaba v Severnej Amerike a jej bučanie pripomína revanie býka.",
    falseFacts:["Žaba volská je malá žaba veľkosti palca.","Žaba volská žije výhradne na súši.","Žaba volská je jedovatá."] },
  { name:"Snapping turtle", label:"Korytnačka kajmancia", continent:"Severná Amerika", sciName:"Chelydra serpentina",
    fact:"Korytnačka kajmancia má mimoriadne silný hryz a dokáže prehrýzť aj drevenú palicu.",
    falseFacts:["Korytnačka kajmancia je malá a neškodná.","Korytnačka kajmancia žije výhradne na súši.","Korytnačka kajmancia sa živí výhradne rastlinami."] },
  { name:"Bighorn sheep", label:"Ovca tlstorohá", continent:"Severná Amerika", sciName:"Ovis canadensis",
    fact:"Ovca tlstorohá sa pri súbojoch samcov trkáva hlavami silou porovnateľnou s nárazom auta pri 55 km/h.",
    falseFacts:["Ovca tlstorohá žije v nížinných lúkach.","Ovca tlstorohá má tenké a rovné rohy.","Ovca tlstorohá je domestikované zviera."] },
  { name:"Mountain goat", label:"Kamzík snežný", continent:"Severná Amerika", sciName:"Oreamnos americanus",
    fact:"Kamzík snežný žije vo výškach nad 3 000 metrov a dokáže liezť po takmer kolmých skalách.",
    falseFacts:["Kamzík snežný je skutočná koza príbuzná domácej koze.","Kamzík snežný žije v lesoch na nížinách.","Kamzík snežný mení farbu srsti na hnedú v lete."] },
  { name:"Manatee", label:"Kapustňák americký", continent:"Severná Amerika", sciName:"Trichechus manatus",
    fact:"Kapustňák americký je jemný morský cicavec, ktorý sa živí výhradne morskými riasami a trávou a váži až 600 kg.",
    falseFacts:["Kapustňák americký je dravec živiaci sa rybami.","Kapustňák americký žije v studených arktických vodách.","Kapustňák americký je príbuzný tuleňom."] },
  { name:"Armadillo", label:"Pásavec deväťpásový", continent:"Severná Amerika", sciName:"Dasypus novemcinctus",
    fact:"Pásavec deväťpásový má kostený pancier a vždy rodí jednovaječné štvičatá.",
    falseFacts:["Pásavec deväťpásový sa dokáže stočiť do dokonalej gule.","Pásavec deväťpásový žije výhradne v Južnej Amerike.","Pásavec deväťpásový je príbuzný korytnačkám."] },
  { name:"Opossum", label:"Oposum virgínsky", continent:"Severná Amerika", sciName:"Didelphis virginiana",
    fact:"Oposum virgínsky pri ohrození predstiera smrť – zostane nepohyblivý a dokonca vypúšťa zapáchajúcu tekutinu.",
    falseFacts:["Oposum virgínsky je agresívne zviera, ktoré útočí na predátorov.","Oposum virgínsky je hlodavec príbuzný potkanovi.","Oposum virgínsky žije výhradne v tropických pralesoch."] },
  { name:"Prairie dog", label:"Psoun prérijný", continent:"Severná Amerika", sciName:"Cynomys ludovicianus",
    fact:"Psoun prérijný žije v obrovských podzemných kolóniách nazývaných mestečká, ktoré môžu mať tisíce obyvateľov.",
    falseFacts:["Psoun prérijný je príbuzný psom.","Psoun prérijný žije na stromoch.","Psoun prérijný je samotárske zviera."] },
  { name:"River otter", label:"Vydra riečna severoamerická", continent:"Severná Amerika", sciName:"Lontra canadensis",
    fact:"Vydra riečna severoamerická je hravé zviera a klže sa po blate a snehu len pre zábavu.",
    falseFacts:["Vydra riečna severoamerická je pomalý plavec.","Vydra riečna severoamerická žije výhradne na súši.","Vydra riečna severoamerická sa živí rastlinami."] },
  { name:"American crow", label:"Vrana americká", continent:"Severná Amerika", sciName:"Corvus brachyrhynchos",
    fact:"Vrana americká patrí medzi najinteligentnejšie vtáky – dokáže používať nástroje a rozpoznávať ľudské tváre.",
    falseFacts:["Vrana americká je hlúpy vták neschopný učenia sa.","Vrana americká žije samotársky.","Vrana americká sa živí výhradne mršinami."] },
  { name:"Ruby-throated hummingbird", label:"Kolibrík rubínohrdlý", continent:"Severná Amerika", sciName:"Archilochus colubris",
    fact:"Kolibrík rubínohrdlý máva krídlami až 53-krát za sekundu a ako jediný vták dokáže lietať dozadu.",
    falseFacts:["Kolibrík rubínohrdlý je veľký vták veľkosti holuba.","Kolibrík rubínohrdlý máva krídlami pomaly ako orol.","Kolibrík rubínohrdlý sa živí výhradne hmyzom."] },
  { name:"Hellbender", label:"Hellbender", continent:"Severná Amerika", sciName:"Cryptobranchus alleganiensis",
    fact:"Hellbender je najväčší severoamerický obojživelník – dosahuje dĺžku až 74 cm a dýcha prevažne kožou.",
    falseFacts:["Hellbender je malý mlok veľkosti prsta.","Hellbender žije na súši v lesoch.","Hellbender je jedovatý obojživelník."] },
  { name:"Wolverine NA", label:"Rosomák severoamerický", continent:"Severná Amerika", sciName:"Gulo gulo luscus",
    fact:"Rosomák severoamerický je neuveriteľne silný – dokáže ukradnúť korisť aj medveďovi grizly.",
    falseFacts:["Rosomák severoamerický je plachý a bojazlivý tvor.","Rosomák severoamerický je príbuzný vlkom.","Rosomák severoamerický žije v teplých oblastiach Floridy."] },
  { name:"Muskox", label:"Pižmoň severný", continent:"Severná Amerika", sciName:"Ovibos moschatus",
    fact:"Pižmoň severný má podsrstku zvanú qiviut, ktorá je osemkrát teplejšia ako ovčia vlna.",
    falseFacts:["Pižmoň severný žije v teplých oblastiach Mexika.","Pižmoň severný je príbuzný bivolov.","Pižmoň severný nemá žiadnu podsrstku."] },
  { name:"Osprey", label:"Kršiak rybár", continent:"Severná Amerika", sciName:"Pandion haliaetus",
    fact:"Kršiak rybár sa potápa nohami napred do vody a má špeciálne drsné vankúšiky na labkách na uchopenie klzkých rýb.",
    falseFacts:["Kršiak rybár loví ryby zobákom ako pelikán.","Kršiak rybár sa živí výhradne hlodavcami.","Kršiak rybár nedokáže plávať ani sa ponoriť do vody."] },
  { name:"American marten", label:"Kuna americká", continent:"Severná Amerika", sciName:"Martes americana",
    fact:"Kuna americká je obratný lezec žijúci v ihličnatých lesoch a loví veverice vysoko v korunách stromov.",
    falseFacts:["Kuna americká žije v púšťach.","Kuna americká je veľká ako medveď.","Kuna americká sa živí výhradne plodmi."] }

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
