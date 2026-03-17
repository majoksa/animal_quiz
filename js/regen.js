/* ═══════════════════════════════════════════════
   regen.js – Regenerate animal archive to localStorage
   ═══════════════════════════════════════════════

   Fetches fresh data from Wikipedia Summary API for all seeded
   animals and persists the result in localStorage.
   api.js reads from localStorage preferentially.
*/

const Regen = (() => {

  const LS_KEY = 'animal_quiz_data';

  /* ── Curated seed list (matches scripts/generate.html) ── */
  const ANIMALS_SEED = [
    // AFRICA
    { name:"Lion",                continent:"Africa",        sciName:"Panthera leo" },
    { name:"African elephant",    continent:"Africa",        sciName:"Loxodonta africana" },
    { name:"Giraffe",             continent:"Africa",        sciName:"Giraffa camelopardalis" },
    { name:"Plains zebra",        continent:"Africa",        sciName:"Equus quagga" },
    { name:"Hippopotamus",        continent:"Africa",        sciName:"Hippopotamus amphibius" },
    { name:"Western gorilla",     continent:"Africa",        sciName:"Gorilla gorilla" },
    { name:"Cheetah",             continent:"Africa",        sciName:"Acinonyx jubatus" },
    { name:"Leopard",             continent:"Africa",        sciName:"Panthera pardus" },
    { name:"African buffalo",     continent:"Africa",        sciName:"Syncerus caffer" },
    { name:"Spotted hyena",       continent:"Africa",        sciName:"Crocuta crocuta" },
    { name:"Meerkat",             continent:"Africa",        sciName:"Suricata suricatta" },
    { name:"African wild dog",    continent:"Africa",        sciName:"Lycaon pictus" },
    { name:"Mandrill",            continent:"Africa",        sciName:"Mandrillus sphinx" },
    { name:"Black rhinoceros",    continent:"Africa",        sciName:"Diceros bicornis" },
    { name:"Nile crocodile",      continent:"Africa",        sciName:"Crocodylus niloticus" },
    { name:"Common ostrich",      continent:"Africa",        sciName:"Struthio camelus" },
    { name:"Greater flamingo",    continent:"Africa",        sciName:"Phoenicopterus roseus" },
    { name:"Warthog",             continent:"Africa",        sciName:"Phacochoerus africanus" },
    { name:"Blue wildebeest",     continent:"Africa",        sciName:"Connochaetes taurinus" },
    { name:"Springbok",           continent:"Africa",        sciName:"Antidorcas marsupialis" },
    { name:"Aardvark",            continent:"Africa",        sciName:"Orycteropus afer" },
    { name:"Okapi",               continent:"Africa",        sciName:"Okapia johnstoni" },
    { name:"Shoebill",            continent:"Africa",        sciName:"Balaeniceps rex" },
    { name:"African penguin",     continent:"Africa",        sciName:"Spheniscus demersus" },
    { name:"Honey badger",        continent:"Africa",        sciName:"Mellivora capensis" },
    { name:"Caracal",             continent:"Africa",        sciName:"Caracal caracal" },
    { name:"Serval",              continent:"Africa",        sciName:"Leptailurus serval" },
    { name:"Secretary bird",      continent:"Africa",        sciName:"Sagittarius serpentarius" },
    { name:"Gerenuk",             continent:"Africa",        sciName:"Litocranius walleri" },
    { name:"Impala",              continent:"Africa",        sciName:"Aepyceros melampus" },

    // ASIA
    { name:"Bengal tiger",        continent:"Asia",          sciName:"Panthera tigris tigris" },
    { name:"Giant panda",         continent:"Asia",          sciName:"Ailuropoda melanoleuca" },
    { name:"Asian elephant",      continent:"Asia",          sciName:"Elephas maximus" },
    { name:"Snow leopard",        continent:"Asia",          sciName:"Panthera uncia" },
    { name:"Komodo dragon",       continent:"Asia",          sciName:"Varanus komodoensis" },
    { name:"King cobra",          continent:"Asia",          sciName:"Ophiophagus hannah" },
    { name:"Orangutan",           continent:"Asia",          sciName:"Pongo pygmaeus" },
    { name:"Proboscis monkey",    continent:"Asia",          sciName:"Nasalis larvatus" },
    { name:"Indian rhinoceros",   continent:"Asia",          sciName:"Rhinoceros unicornis" },
    { name:"Red panda",           continent:"Asia",          sciName:"Ailurus fulgens" },
    { name:"Japanese macaque",    continent:"Asia",          sciName:"Macaca fuscata" },
    { name:"Indian peafowl",      continent:"Asia",          sciName:"Pavo cristatus" },
    { name:"Binturong",           continent:"Asia",          sciName:"Arctictis binturong" },
    { name:"Sun bear",            continent:"Asia",          sciName:"Helarctos malayanus" },
    { name:"Malayan tapir",       continent:"Asia",          sciName:"Tapirus indicus" },
    { name:"Gharial",             continent:"Asia",          sciName:"Gavialis gangeticus" },
    { name:"Mandarin duck",       continent:"Asia",          sciName:"Aix galericulata" },
    { name:"Siamang",             continent:"Asia",          sciName:"Symphalangus syndactylus" },
    { name:"Bactrian camel",      continent:"Asia",          sciName:"Camelus bactrianus" },
    { name:"Saiga antelope",      continent:"Asia",          sciName:"Saiga tatarica" },
    { name:"Markhor",             continent:"Asia",          sciName:"Capra falconeri" },
    { name:"Yak",                 continent:"Asia",          sciName:"Bos grunniens" },
    { name:"Pallas's cat",        continent:"Asia",          sciName:"Otocolobus manul" },
    { name:"Clouded leopard",     continent:"Asia",          sciName:"Neofelis nebulosa" },
    { name:"Babirusa",            continent:"Asia",          sciName:"Babyrousa babyrussa" },
    { name:"Slow loris",          continent:"Asia",          sciName:"Nycticebus coucang" },
    { name:"Saltwater crocodile", continent:"Asia",          sciName:"Crocodylus porosus" },
    { name:"Flying lemur",        continent:"Asia",          sciName:"Galeopterus variegatus" },
    { name:"Tarsier",             continent:"Asia",          sciName:"Tarsius tarsier" },
    { name:"Draco lizard",        continent:"Asia",          sciName:"Draco volans" },

    // EUROPE
    { name:"Brown bear",          continent:["Europe","Asia"],sciName:"Ursus arctos" },
    { name:"European bison",      continent:"Europe",        sciName:"Bison bonasus" },
    { name:"Grey wolf",           continent:["Europe","Asia"],sciName:"Canis lupus" },
    { name:"Eurasian lynx",       continent:"Europe",        sciName:"Lynx lynx" },
    { name:"Wild boar",           continent:"Europe",        sciName:"Sus scrofa" },
    { name:"Red fox",             continent:"Europe",        sciName:"Vulpes vulpes" },
    { name:"Roe deer",            continent:"Europe",        sciName:"Capreolus capreolus" },
    { name:"European beaver",     continent:"Europe",        sciName:"Castor fiber" },
    { name:"White stork",         continent:"Europe",        sciName:"Ciconia ciconia" },
    { name:"Barn owl",            continent:"Europe",        sciName:"Tyto alba" },
    { name:"Eurasian eagle-owl",  continent:"Europe",        sciName:"Bubo bubo" },
    { name:"Atlantic puffin",     continent:"Europe",        sciName:"Fratercula arctica" },
    { name:"Dalmatian pelican",   continent:"Europe",        sciName:"Pelecanus crispus" },
    { name:"European hedgehog",   continent:"Europe",        sciName:"Erinaceus europaeus" },
    { name:"Alpine ibex",         continent:"Europe",        sciName:"Capra ibex" },
    { name:"Chamois",             continent:"Europe",        sciName:"Rupicapra rupicapra" },
    { name:"European otter",      continent:"Europe",        sciName:"Lutra lutra" },
    { name:"Wolverine",           continent:["North America","Europe"], sciName:"Gulo gulo" },
    { name:"European mink",       continent:"Europe",        sciName:"Mustela lutreola" },
    { name:"Mouflon",             continent:"Europe",        sciName:"Ovis gmelini" },

    // NORTH AMERICA
    { name:"Grizzly bear",            continent:"North America", sciName:"Ursus arctos horribilis" },
    { name:"American bison",          continent:"North America", sciName:"Bison bison" },
    { name:"Moose",                   continent:["North America","Europe"], sciName:"Alces alces" },
    { name:"White-tailed deer",       continent:"North America", sciName:"Odocoileus virginianus" },
    { name:"Bald eagle",              continent:"North America", sciName:"Haliaeetus leucocephalus" },
    { name:"American alligator",      continent:"North America", sciName:"Alligator mississippiensis" },
    { name:"Cougar",                  continent:"North America", sciName:"Puma concolor" },
    { name:"American black bear",     continent:"North America", sciName:"Ursus americanus" },
    { name:"American pronghorn",      continent:"North America", sciName:"Antilocapra americana" },
    { name:"California condor",       continent:"North America", sciName:"Gymnogyps californianus" },
    { name:"North American river otter", continent:"North America", sciName:"Lontra canadensis" },
    { name:"Wild turkey",             continent:"North America", sciName:"Meleagris gallopavo" },
    { name:"Striped skunk",           continent:"North America", sciName:"Mephitis mephitis" },
    { name:"Virginia opossum",        continent:"North America", sciName:"Didelphis virginiana" },
    { name:"American beaver",         continent:"North America", sciName:"Castor canadensis" },
    { name:"Common raccoon",          continent:"North America", sciName:"Procyon lotor" },
    { name:"Black-tailed prairie dog",continent:"North America", sciName:"Cynomys ludovicianus" },
    { name:"Nine-banded armadillo",   continent:"North America", sciName:"Dasypus novemcinctus" },
    { name:"Sea otter",               continent:"North America", sciName:"Enhydra lutris" },
    { name:"Northern elephant seal",  continent:"North America", sciName:"Mirounga angustirostris" },
    { name:"Snowy owl",               continent:"North America", sciName:"Bubo scandiacus" },
    { name:"American badger",         continent:"North America", sciName:"Taxidea taxus" },
    { name:"Bobcat",                  continent:"North America", sciName:"Lynx rufus" },
    { name:"Canada lynx",             continent:"North America", sciName:"Lynx canadensis" },

    // SOUTH AMERICA
    { name:"Jaguar",              continent:"South America", sciName:"Panthera onca" },
    { name:"Capybara",            continent:"South America", sciName:"Hydrochoerus hydrochaeris" },
    { name:"South American tapir",continent:"South America", sciName:"Tapirus terrestris" },
    { name:"Llama",               continent:"South America", sciName:"Lama glama" },
    { name:"Giant anteater",      continent:"South America", sciName:"Myrmecophaga tridactyla" },
    { name:"Pale-throated sloth", continent:"South America", sciName:"Bradypus tridactylus" },
    { name:"Green anaconda",      continent:"South America", sciName:"Eunectes murinus" },
    { name:"Harpy eagle",         continent:"South America", sciName:"Harpia harpyja" },
    { name:"Toco toucan",         continent:"South America", sciName:"Ramphastos toco" },
    { name:"Giant armadillo",     continent:"South America", sciName:"Priodontes maximus" },
    { name:"Maned wolf",          continent:"South America", sciName:"Chrysocyon brachyurus" },
    { name:"Giant river otter",   continent:"South America", sciName:"Pteronura brasiliensis" },
    { name:"Spectacled bear",     continent:"South America", sciName:"Tremarctos ornatus" },
    { name:"Ocelot",              continent:"South America", sciName:"Leopardus pardalis" },
    { name:"Alpaca",              continent:"South America", sciName:"Vicugna pacos" },
    { name:"Amazon river dolphin",continent:"South America", sciName:"Inia geoffrensis" },
    { name:"Red-bellied piranha", continent:"South America", sciName:"Pygocentrus nattereri" },
    { name:"Arapaima",            continent:"South America", sciName:"Arapaima gigas" },
    { name:"Guanaco",             continent:"South America", sciName:"Lama guanicoe" },
    { name:"Viscacha",            continent:"South America", sciName:"Lagidium viscacia" },
    { name:"Patagonian mara",     continent:"South America", sciName:"Dolichotis patagonum" },
    { name:"South American coati",continent:"South America", sciName:"Nasua nasua" },
    { name:"Pampas deer",         continent:"South America", sciName:"Ozotoceros bezoarticus" },
    { name:"Marsh deer",          continent:"South America", sciName:"Blastocerus dichotomus" },
    { name:"Poison dart frog",    continent:"South America", sciName:"Dendrobates tinctorius" },

    // AUSTRALIA
    { name:"Red kangaroo",        continent:"Australia",     sciName:"Osphranter rufus" },
    { name:"Koala",               continent:"Australia",     sciName:"Phascolarctos cinereus" },
    { name:"Common wombat",       continent:"Australia",     sciName:"Vombatus ursinus" },
    { name:"Tasmanian devil",     continent:"Australia",     sciName:"Sarcophilus harrisii" },
    { name:"Platypus",            continent:"Australia",     sciName:"Ornithorhynchus anatinus" },
    { name:"Short-beaked echidna",continent:"Australia",     sciName:"Tachyglossus aculeatus" },
    { name:"Laughing kookaburra", continent:"Australia",     sciName:"Dacelo novaeguineae" },
    { name:"Emu",                 continent:"Australia",     sciName:"Dromaius novaehollandiae" },
    { name:"Southern cassowary",  continent:"Australia",     sciName:"Casuarius casuarius" },
    { name:"Thorny devil",        continent:"Australia",     sciName:"Moloch horridus" },
    { name:"Frilled-neck lizard", continent:"Australia",     sciName:"Chlamydosaurus kingii" },
    { name:"Quokka",              continent:"Australia",     sciName:"Setonix brachyurus" },
    { name:"Numbat",              continent:"Australia",     sciName:"Myrmecobius fasciatus" },
    { name:"Sugar glider",        continent:"Australia",     sciName:"Petaurus breviceps" },
    { name:"Dingo",               continent:"Australia",     sciName:"Canis lupus dingo" },
    { name:"Wedge-tailed eagle",  continent:"Australia",     sciName:"Aquila audax" },
    { name:"Bilby",               continent:"Australia",     sciName:"Macrotis lagotis" },
    { name:"Quoll",               continent:"Australia",     sciName:"Dasyurus viverrinus" },
    { name:"Eastern grey kangaroo", continent:"Australia",   sciName:"Macropus giganteus" },
    { name:"Tree kangaroo",       continent:"Australia",     sciName:"Dendrolagus lumholtzi" },

    // AFRICA (extra)
    { name:"African fish eagle",      continent:"Africa",    sciName:"Haliaeetus vocifer" },
    { name:"African grey parrot",     continent:"Africa",    sciName:"Psittacus erithacus" },
    { name:"Bongo antelope",          continent:"Africa",    sciName:"Tragelaphus eurycerus" },
    { name:"Greater kudu",            continent:"Africa",    sciName:"Tragelaphus strepsiceros" },
    { name:"Common eland",            continent:"Africa",    sciName:"Tragelaphus oryx" },
    { name:"Gemsbok",                 continent:"Africa",    sciName:"Oryx gazella" },
    { name:"Sable antelope",          continent:"Africa",    sciName:"Hippotragus niger" },
    { name:"Topi",                    continent:"Africa",    sciName:"Damaliscus lunatus" },
    { name:"Red hartebeest",          continent:"Africa",    sciName:"Alcelaphus buselaphus caama" },
    { name:"Kirk's dik-dik",          continent:"Africa",    sciName:"Madoqua kirkii" },
    { name:"African civet",           continent:"Africa",    sciName:"Civettictis civetta" },
    { name:"Common genet",            continent:"Africa",    sciName:"Genetta genetta" },
    { name:"Rock hyrax",              continent:"Africa",    sciName:"Procavia capensis" },
    { name:"Cape porcupine",          continent:"Africa",    sciName:"Hystrix africaeaustralis" },
    { name:"Yellow mongoose",         continent:"Africa",    sciName:"Cynictis penicillata" },
    { name:"African clawless otter",  continent:"Africa",    sciName:"Aonyx capensis" },
    { name:"Marabou stork",           continent:"Africa",    sciName:"Leptoptilos crumenifer" },
    { name:"Kori bustard",            continent:"Africa",    sciName:"Ardeotis kori" },
    { name:"Bateleur",                continent:"Africa",    sciName:"Terathopius ecaudatus" },
    { name:"Saddle-billed stork",     continent:"Africa",    sciName:"Ephippiorhynchus senegalensis" },
    { name:"Lilac-breasted roller",   continent:"Africa",    sciName:"Coracias caudatus" },
    { name:"Ground pangolin",         continent:"Africa",    sciName:"Smutsia temminckii" },
    { name:"Lappet-faced vulture",    continent:"Africa",    sciName:"Torgos tracheliotos" },
    { name:"African wild cat",        continent:"Africa",    sciName:"Felis lybica" },
    { name:"Nile monitor",            continent:"Africa",    sciName:"Varanus niloticus" },

    // ASIA (extra)
    { name:"Amur leopard",            continent:"Asia",      sciName:"Panthera pardus orientalis" },
    { name:"Asian black bear",        continent:"Asia",      sciName:"Ursus thibetanus" },
    { name:"Dhole",                   continent:"Asia",      sciName:"Cuon alpinus" },
    { name:"Fishing cat",             continent:"Asia",      sciName:"Prionailurus viverrinus" },
    { name:"Irrawaddy dolphin",       continent:"Asia",      sciName:"Orcaella brevirostris" },
    { name:"Dugong",                  continent:"Asia",      sciName:"Dugong dugon" },
    { name:"Asian small-clawed otter",continent:"Asia",      sciName:"Aonyx cinereus" },
    { name:"Indian flying fox",       continent:"Asia",      sciName:"Pteropus giganteus" },
    { name:"Golden snub-nosed monkey",continent:"Asia",      sciName:"Rhinopithecus roxellana" },
    { name:"Tibetan fox",             continent:"Asia",      sciName:"Vulpes ferrilata" },
    { name:"Tibetan antelope",        continent:"Asia",      sciName:"Pantholops hodgsonii" },
    { name:"Kiang",                   continent:"Asia",      sciName:"Equus kiang" },
    { name:"Himalayan tahr",          continent:"Asia",      sciName:"Hemitragus jemlahicus" },
    { name:"Gaur",                    continent:"Asia",      sciName:"Bos gaurus" },
    { name:"Chinese alligator",       continent:"Asia",      sciName:"Alligator sinensis" },
    { name:"Indian python",           continent:"Asia",      sciName:"Python molurus" },
    { name:"Reticulated python",      continent:"Asia",      sciName:"Malayopython reticulatus" },
    { name:"Javan rhinoceros",        continent:"Asia",      sciName:"Rhinoceros sondaicus" },
    { name:"Sumatran rhinoceros",     continent:"Asia",      sciName:"Dicerorhinus sumatrensis" },
    { name:"Pig-tailed macaque",      continent:"Asia",      sciName:"Macaca nemestrina" },
    { name:"Lar gibbon",              continent:"Asia",      sciName:"Hylobates lar" },
    { name:"Bornean orangutan",       continent:"Asia",      sciName:"Pongo pygmaeus" },
    { name:"Sumatran tiger",          continent:"Asia",      sciName:"Panthera tigris sumatrae" },
    { name:"Greater one-horned rhinoceros", continent:"Asia",sciName:"Rhinoceros unicornis" },
    { name:"Asian water buffalo",     continent:"Asia",      sciName:"Bubalus bubalis" },

    // EUROPE (extra)
    { name:"Red deer",                continent:"Europe",    sciName:"Cervus elaphus" },
    { name:"Fallow deer",             continent:"Europe",    sciName:"Dama dama" },
    { name:"Reindeer",                continent:["Europe","North America"], sciName:"Rangifer tarandus" },
    { name:"Arctic fox",              continent:["Europe","North America"], sciName:"Vulpes lagopus" },
    { name:"Golden eagle",            continent:"Europe",    sciName:"Aquila chrysaetos" },
    { name:"White-tailed eagle",      continent:"Europe",    sciName:"Haliaeetus albicilla" },
    { name:"Peregrine falcon",        continent:"Europe",    sciName:"Falco peregrinus" },
    { name:"Common kingfisher",       continent:"Europe",    sciName:"Alcedo atthis" },
    { name:"European bee-eater",      continent:"Europe",    sciName:"Merops apiaster" },
    { name:"Hoopoe",                  continent:"Europe",    sciName:"Upupa epops" },
    { name:"Common crane",            continent:"Europe",    sciName:"Grus grus" },
    { name:"Eurasian spoonbill",      continent:"Europe",    sciName:"Platalea leucorodia" },
    { name:"European badger",         continent:"Europe",    sciName:"Meles meles" },
    { name:"Stone marten",            continent:"Europe",    sciName:"Martes foina" },
    { name:"European polecat",        continent:"Europe",    sciName:"Mustela putorius" },
    { name:"Eurasian water vole",     continent:"Europe",    sciName:"Arvicola amphibius" },
    { name:"European ground squirrel",continent:"Europe",    sciName:"Spermophilus citellus" },
    { name:"Common kestrel",          continent:"Europe",    sciName:"Falco tinnunculus" },
    { name:"Black stork",             continent:"Europe",    sciName:"Ciconia nigra" },
    { name:"Great grey owl",          continent:"Europe",    sciName:"Strix nebulosa" },

    // NORTH AMERICA (extra)
    { name:"Polar bear",              continent:["North America","Europe"], sciName:"Ursus maritimus" },
    { name:"Musk ox",                 continent:"North America", sciName:"Ovibos moschatus" },
    { name:"Caribou",                 continent:"North America", sciName:"Rangifer tarandus" },
    { name:"Walrus",                  continent:"North America", sciName:"Odobenus rosmarus" },
    { name:"Harbor seal",             continent:"North America", sciName:"Phoca vitulina" },
    { name:"Steller sea lion",        continent:"North America", sciName:"Eumetopias jubatus" },
    { name:"American mink",           continent:"North America", sciName:"Neovison vison" },
    { name:"Whooping crane",          continent:"North America", sciName:"Grus americana" },
    { name:"Sandhill crane",          continent:"North America", sciName:"Antigone canadensis" },
    { name:"Great blue heron",        continent:"North America", sciName:"Ardea herodias" },
    { name:"Roseate spoonbill",       continent:"North America", sciName:"Platalea ajaja" },
    { name:"Wood duck",               continent:"North America", sciName:"Aix sponsa" },
    { name:"American pika",           continent:"North America", sciName:"Ochotona princeps" },
    { name:"Mountain goat",           continent:"North America", sciName:"Oreamnos americanus" },
    { name:"Bighorn sheep",           continent:"North America", sciName:"Ovis canadensis" },
    { name:"Eastern box turtle",      continent:"North America", sciName:"Terrapene carolina" },
    { name:"American bullfrog",       continent:"North America", sciName:"Lithobates catesbeianus" },
    { name:"Northern mockingbird",    continent:"North America", sciName:"Mimus polyglottos" },
    { name:"Ruby-throated hummingbird",continent:"North America",sciName:"Archilochus colubris" },

    // SOUTH AMERICA (extra)
    { name:"Andean condor",           continent:"South America", sciName:"Vultur gryphus" },
    { name:"Jabiru",                  continent:"South America", sciName:"Jabiru mycteria" },
    { name:"Scarlet macaw",           continent:"South America", sciName:"Ara macao" },
    { name:"Blue-and-yellow macaw",   continent:"South America", sciName:"Ara ararauna" },
    { name:"Hyacinth macaw",          continent:"South America", sciName:"Anodorhynchus hyacinthinus" },
    { name:"Hoatzin",                 continent:"South America", sciName:"Opisthocomus hoazin" },
    { name:"Sunbittern",              continent:"South America", sciName:"Eurypyga helias" },
    { name:"Scarlet ibis",            continent:"South America", sciName:"Eudocimus ruber" },
    { name:"Andean flamingo",         continent:"South America", sciName:"Phoenicoparrus andinus" },
    { name:"Chilean flamingo",        continent:"South America", sciName:"Phoenicopterus chilensis" },
    { name:"Black-necked swan",       continent:"South America", sciName:"Cygnus melancoryphus" },
    { name:"Darwin's rhea",           continent:"South America", sciName:"Rhea pennata" },
    { name:"Mountain tapir",          continent:"South America", sciName:"Tapirus pinchaque" },
    { name:"Giant toad",              continent:"South America", sciName:"Rhinella marina" },
    { name:"Glass frog",              continent:"South America", sciName:"Centrolenidae" },
    { name:"Matamata",                continent:"South America", sciName:"Chelus fimbriata" },
    { name:"South American sea lion", continent:"South America", sciName:"Otaria flavescens" },
    { name:"Boto",                    continent:"South America", sciName:"Inia geoffrensis" },
    { name:"Piranha",                 continent:"South America", sciName:"Serrasalmidae" },

    // AUSTRALIA (extra)
    { name:"Wallaby",                 continent:"Australia",     sciName:"Notamacropus agilis" },
    { name:"Common brushtail possum", continent:"Australia",     sciName:"Trichosurus vulpecula" },
    { name:"Common ringtail possum",  continent:"Australia",     sciName:"Pseudocheirus peregrinus" },
    { name:"Eastern quoll",           continent:"Australia",     sciName:"Dasyurus viverrinus" },
    { name:"Spotted-tailed quoll",    continent:"Australia",     sciName:"Dasyurus maculatus" },
    { name:"Tawny frogmouth",         continent:"Australia",     sciName:"Podargus strigoides" },
    { name:"Brolga",                  continent:"Australia",     sciName:"Antigone rubicunda" },
    { name:"Australian pelican",      continent:"Australia",     sciName:"Pelecanus conspicillatus" },
    { name:"Sulphur-crested cockatoo",continent:"Australia",     sciName:"Cacatua galerita" },
    { name:"Australian magpie",       continent:"Australia",     sciName:"Gymnorhina tibicen" },
    { name:"Galah",                   continent:"Australia",     sciName:"Eolophus roseicapilla" },
    { name:"Superb fairywren",        continent:"Australia",     sciName:"Malurus cyaneus" },
    { name:"Kakapo",                  continent:"Australia",     sciName:"Strigops habroptilus" },
    { name:"Kiwi",                    continent:"Australia",     sciName:"Apteryx australis" },
    { name:"Tuatara",                 continent:"Australia",     sciName:"Sphenodon punctatus" },

    // OCEAN / WORLDWIDE MARINE
    { name:"Orca",                    continent:"Antarctica",    sciName:"Orcinus orca",              ocean:"Pacific Ocean" },
    { name:"Humpback whale",          continent:"Antarctica",    sciName:"Megaptera novaeangliae",     ocean:["Atlantic Ocean","Pacific Ocean"] },
    { name:"Blue whale",              continent:"Antarctica",    sciName:"Balaenoptera musculus",      ocean:["Southern Ocean","Pacific Ocean"] },
    { name:"Sperm whale",             continent:"North America", sciName:"Physeter macrocephalus",     ocean:"Pacific Ocean" },
    { name:"Bottlenose dolphin",      continent:"Europe",        sciName:"Tursiops truncatus",         ocean:"Atlantic Ocean" },
    { name:"Great white shark",       continent:"Africa",        sciName:"Carcharodon carcharias",     ocean:"Pacific Ocean" },
    { name:"Whale shark",             continent:"Asia",          sciName:"Rhincodon typus",            ocean:"Indian Ocean" },
    { name:"Manta ray",               continent:"Asia",          sciName:"Mobula birostris",           ocean:"Pacific Ocean" },
    { name:"Hammerhead shark",        continent:"Africa",        sciName:"Sphyrna lewini",             ocean:"Atlantic Ocean" },
    { name:"Green sea turtle",        continent:"Australia",     sciName:"Chelonia mydas",             ocean:"Pacific Ocean" },
    { name:"Leatherback sea turtle",  continent:"South America", sciName:"Dermochelys coriacea",       ocean:"Atlantic Ocean" },
    { name:"Loggerhead sea turtle",   continent:"Europe",        sciName:"Caretta caretta",            ocean:"Mediterranean Sea" },
    { name:"Narwhal",                 continent:"North America", sciName:"Monodon monoceros",          ocean:["Arctic Ocean","Atlantic Ocean"] },
    { name:"Beluga whale",            continent:"North America", sciName:"Delphinapterus leucas",      ocean:["Arctic Ocean","Atlantic Ocean"] },
    { name:"Common seal",             continent:"Europe",        sciName:"Phoca vitulina",             ocean:["Atlantic Ocean","Arctic Ocean"] },
    { name:"Mediterranean monk seal", continent:"Europe",        sciName:"Monachus monachus",          ocean:"Mediterranean Sea" },
    { name:"Common octopus",          continent:"Europe",        sciName:"Octopus vulgaris",           ocean:"Mediterranean Sea" },
    { name:"Giant Pacific octopus",   continent:"North America", sciName:"Enteroctopus dofleini",      ocean:"Pacific Ocean" },
    { name:"Clownfish",               continent:"Australia",     sciName:"Amphiprion ocellaris",       ocean:"Pacific Ocean" },
    { name:"Lionfish",                continent:"Asia",          sciName:"Pterois volitans",           ocean:"Pacific Ocean" },

    // MORE AFRICA
    { name:"Pygmy hippopotamus",      continent:"Africa",        sciName:"Choeropsis liberiensis" },
    { name:"White rhinoceros",        continent:"Africa",        sciName:"Ceratotherium simum" },
    { name:"African forest elephant", continent:"Africa",        sciName:"Loxodonta cyclotis" },
    { name:"Bonobo",                  continent:"Africa",        sciName:"Pan paniscus" },
    { name:"Common chimpanzee",       continent:"Africa",        sciName:"Pan troglodytes" },
    { name:"Olive baboon",            continent:"Africa",        sciName:"Papio anubis" },
    { name:"Nile tilapia",            continent:"Africa",        sciName:"Oreochromis niloticus" },
    { name:"African bullfrog",        continent:"Africa",        sciName:"Pyxicephalus adspersus" },
    { name:"Puff adder",              continent:"Africa",        sciName:"Bitis arietans" },
    { name:"Black mamba",             continent:"Africa",        sciName:"Dendroaspis polylepis" },

    // MORE ASIA
    { name:"Giant ibis",              continent:"Asia",          sciName:"Thaumatibis gigantea" },
    { name:"Bali myna",               continent:"Asia",          sciName:"Leucopsar rothschildi" },
    { name:"Sunda pangolin",          continent:"Asia",          sciName:"Manis javanica" },
    { name:"Pygmy slow loris",        continent:"Asia",          sciName:"Nycticebus pygmaeus" },
    { name:"Gelada",                  continent:"Africa",        sciName:"Theropithecus gelada" },
    { name:"Indian star tortoise",    continent:"Asia",          sciName:"Geochelone elegans" },

    // ANTARCTICA
    { name:"Emperor penguin",         continent:"Antarctica",    sciName:"Aptenodytes forsteri" },
    { name:"Leopard seal",            continent:"Antarctica",    sciName:"Hydrurga leptonyx" },
    { name:"Weddell seal",            continent:"Antarctica",    sciName:"Leptonychotes weddellii" },
    { name:"Crabeater seal",          continent:"Antarctica",    sciName:"Lobodon carcinophaga" },
    { name:"Antarctic fur seal",      continent:"Antarctica",    sciName:"Arctocephalus gazella" },
    { name:"Southern elephant seal",  continent:"Antarctica",    sciName:"Mirounga leonina" },
    { name:"Chinstrap penguin",       continent:"Antarctica",    sciName:"Pygoscelis antarcticus" },
    { name:"Gentoo penguin",          continent:"Antarctica",    sciName:"Pygoscelis papua" },
    { name:"Adélie penguin",          continent:"Antarctica",    sciName:"Pygoscelis adeliae" },
    { name:"Snow petrel",             continent:"Antarctica",    sciName:"Pagodroma nivea" },
    { name:"Macaroni penguin",        continent:"Antarctica",    sciName:"Eudyptes chrysolophus" },
    { name:"King penguin",            continent:"Antarctica",    sciName:"Aptenodytes patagonicus" },
    { name:"South Polar skua",        continent:"Antarctica",    sciName:"Stercorarius maccormicki" },
  ];

  /* ── Continent / ocean translation maps ── */
  const OCEAN_SK = {
    'Pacific Ocean':     'Tichý oceán',
    'Atlantic Ocean':    'Atlantický oceán',
    'Indian Ocean':      'Indický oceán',
    'Arctic Ocean':      'Severný ľadový oceán',
    'Southern Ocean':    'Antarktický oceán',
    'Mediterranean Sea': 'Stredozemné more',
  };

  const CONTINENT_SK = {
    'Africa':        'Afrika',
    'Asia':          'Ázia',
    'Europe':        'Európa',
    'North America': 'Severná Amerika',
    'South America': 'Južná Amerika',
    'Australia':     'Austrália',
    'Antarctica':    'Antarktída',
  };

  // Translate a habitat value (string or string[]) through a map
  function translateHabitat(value, map) {
    if (Array.isArray(value)) return value.map(v => map[v] || v);
    return map[value] || value;
  }

  /* ── Wikipedia helpers (same logic as generate.html) ── */

  function buildImageUrl(summary) {
    if (summary.originalimage?.source) return summary.originalimage.source;
    if (summary.thumbnail?.source) return summary.thumbnail.source.replace(/\/\d+px-/, '/800px-');
    return null;
  }

  function extractFact(summary) {
    const extract = summary.extract || '';
    const first = extract.split(/\.\s+/)[0];
    if (!first || first.length < 30) return null;
    let fact = first.replace(/\s*\([^)]*\)/g, '').trim();
    if (!fact.endsWith('.')) fact += '.';
    return fact.length >= 30 ? fact : null;
  }

  /* ── Lingva Translate instances (Google Translate proxy, CORS, no API key) ── */
  const LINGVA_INSTANCES = [
    'lingva.ml',
    'translate.plausibility.cloud',
    'lingva.lunar.icu',
  ];

  /**
   * Translate text via Lingva Translate (Google Translate proxy).
   * Tries multiple public instances with fallback.
   * Returns null on failure (so caller can try next method).
   */
  async function translateViaLingva(text) {
    if (!text) return null;
    for (const host of LINGVA_INSTANCES) {
      try {
        const url = `https://${host}/api/v1/en/sk/${encodeURIComponent(text)}`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        if (data?.translation && data.translation !== text) return data.translation;
      } catch { /* try next instance */ }
    }
    return null;
  }

  /**
   * Translate text via MyMemory API (backup).
   * Returns null on failure.
   */
  async function translateViaMyMemory(text, sessionEmail) {
    if (!text) return null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|sk&de=${encodeURIComponent(sessionEmail)}`;
        const res = await fetch(url);
        if (!res.ok) { await new Promise(r => setTimeout(r, 1000 * attempt)); continue; }
        const data = await res.json();
        const translated = data?.responseData?.translatedText;
        if (!translated || translated.startsWith('MYMEMORY WARNING') || translated.startsWith('PLEASE SELECT')) return null;
        if (data?.responseStatus === 403 || data?.responseStatus === 429) return null;
        return translated;
      } catch { await new Promise(r => setTimeout(r, 1000 * attempt)); }
    }
    return null;
  }

  /**
   * Translate text from English to Slovak.
   * Strategy: Lingva (primary) → MyMemory (backup) → original text (fallback).
   */
  async function translateText(text, sessionEmail) {
    if (!text) return text;
    const lingvaResult = await translateViaLingva(text);
    if (lingvaResult) return lingvaResult;
    const myMemoryResult = await translateViaMyMemory(text, sessionEmail);
    if (myMemoryResult) return myMemoryResult;
    return text;
  }

  /**
   * Fetch Slovak labels from Wikidata API in bulk (up to 50 IDs per call).
   * Returns Map<wikidataId, slovakLabel>.
   */
  async function fetchWikidataLabels(wikidataIds) {
    const labels = new Map();
    const BATCH_SIZE = 50;
    for (let i = 0; i < wikidataIds.length; i += BATCH_SIZE) {
      const batch = wikidataIds.slice(i, i + BATCH_SIZE);
      try {
        const ids = batch.join('|');
        const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids}&languages=sk&props=labels&format=json&origin=*`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        if (data?.entities) {
          for (const [id, entity] of Object.entries(data.entities)) {
            const skLabel = entity?.labels?.sk?.value;
            if (skLabel) labels.set(id, skLabel);
          }
        }
      } catch { /* continue with next batch */ }
      if (i + BATCH_SIZE < wikidataIds.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    return labels;
  }

  async function fetchWikiSummary(title, retries = 3) {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        if (attempt === retries) return null;
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
    return null;
  }

  /* ── Public API ── */

  /**
   * Run full regeneration. Callbacks:
   *   onProgress(done, total, ok) – called after each batch
   *   onDone(count)               – called on success
   *   onError(msg)                – called on failure
   */
  async function run(onProgress, onDone, onError) {
    const sessionEmail = `quiz_${Math.random().toString(36).slice(2, 10)}@gmail.com`;
    const seenTitles = new Set();

    // Phase 1: Fetch all Wikipedia summaries and collect wikidata IDs
    const rawAnimals = [];
    const BATCH = 5;
    for (let i = 0; i < ANIMALS_SEED.length; i += BATCH) {
      const batch = ANIMALS_SEED.slice(i, i + BATCH);
      await Promise.all(batch.map(async seed => {
        if (seenTitles.has(seed.name)) return;
        seenTitles.add(seed.name);

        const summary = await fetchWikiSummary(seed.name);
        if (!summary) return;

        const imageUrl = buildImageUrl(summary);
        if (!imageUrl) return;

        const wikidataQid = summary.wikibase_item || null;
        const wikidataId = wikidataQid
          ? `http://www.wikidata.org/entity/${wikidataQid}`
          : `https://en.wikipedia.org/wiki/${encodeURIComponent(seed.name)}`;

        rawAnimals.push({
          seed, wikidataId, wikidataQid, imageUrl,
          enFact: extractFact(summary),
        });
      }));

      onProgress(Math.min(i + BATCH, ANIMALS_SEED.length), ANIMALS_SEED.length, rawAnimals.length);
      await new Promise(r => setTimeout(r, 200));
    }

    if (rawAnimals.length < 15) {
      onError(`Príliš málo zvierat (${rawAnimals.length}). Skontroluj internetové pripojenie.`);
      return;
    }

    // Phase 2: Bulk-fetch Slovak labels from Wikidata
    const wikidataQids = rawAnimals
      .filter(a => a.wikidataQid)
      .map(a => a.wikidataQid);
    const skLabels = await fetchWikidataLabels(wikidataQids);

    // Phase 3: Translate facts (and names missing from Wikidata) via Lingva/MyMemory
    const results = [];
    for (let i = 0; i < rawAnimals.length; i += BATCH) {
      const batch = rawAnimals.slice(i, i + BATCH);
      await Promise.all(batch.map(async raw => {
        // Slovak name: prefer Wikidata label, fallback to translation
        let label = raw.wikidataQid ? skLabels.get(raw.wikidataQid) : null;
        if (!label) {
          label = await translateText(raw.seed.name, sessionEmail);
        }

        // Slovak fact: translate via Lingva/MyMemory
        let fact = null;
        if (raw.enFact) {
          fact = await translateText(raw.enFact, sessionEmail);
        }

        await new Promise(r => setTimeout(r, 300));

        results.push({
          id:        raw.wikidataId,
          label:     label || raw.seed.name,
          imageUrl:  raw.imageUrl,
          continent: translateHabitat(raw.seed.continent, CONTINENT_SK),
          sciName:   raw.seed.sciName,
          fact:      fact || raw.enFact || null,
          ...(raw.seed.ocean ? { ocean: translateHabitat(raw.seed.ocean, OCEAN_SK) } : {}),
        });
      }));

      onProgress(
        ANIMALS_SEED.length,
        ANIMALS_SEED.length,
        results.length
      );
      await new Promise(r => setTimeout(r, 200));
    }

    if (results.length < 15) {
      onError(`Príliš málo zvierat (${results.length}). Skontroluj internetové pripojenie.`);
      return;
    }

    try {
      localStorage.setItem(LS_KEY, JSON.stringify(results));
    } catch (e) {
      onError('Nepodarilo sa uložiť do localStorage: ' + e.message);
      return;
    }

    onDone(results.length);
  }

  function hasLocalData() {
    try { return !!localStorage.getItem(LS_KEY); } catch { return false; }
  }

  function getLocalData() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }

  function getSeedCount() { return ANIMALS_SEED.length; }

  return { run, hasLocalData, getLocalData, getSeedCount, LS_KEY };
})();
