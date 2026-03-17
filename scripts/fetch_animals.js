#!/usr/bin/env node
/**
 * fetch_animals.js – build script using Wikipedia Summary API
 * Uses a curated seed list (same as generate.html) to fetch animal data
 * including images and fun-fact sentences.
 *
 * Usage:
 *   node scripts/fetch_animals.js
 *
 * Output: data/animals.json
 */

'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OUT_FILE = path.join(__dirname, '..', 'data', 'animals.json');

// ---------------------------------------------------------------------------
// Curated seed list – same as generate.html
// ---------------------------------------------------------------------------
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
  { name:"African fish eagle",  continent:"Africa",        sciName:"Haliaeetus vocifer" },
  { name:"African grey parrot", continent:"Africa",        sciName:"Psittacus erithacus" },
  { name:"Bongo antelope",      continent:"Africa",        sciName:"Tragelaphus eurycerus" },
  { name:"Greater kudu",        continent:"Africa",        sciName:"Tragelaphus strepsiceros" },
  { name:"Common eland",        continent:"Africa",        sciName:"Tragelaphus oryx" },
  { name:"Gemsbok",             continent:"Africa",        sciName:"Oryx gazella" },
  { name:"Sable antelope",      continent:"Africa",        sciName:"Hippotragus niger" },
  { name:"Topi",                continent:"Africa",        sciName:"Damaliscus lunatus" },
  { name:"Kirk's dik-dik",      continent:"Africa",        sciName:"Madoqua kirkii" },
  { name:"African civet",       continent:"Africa",        sciName:"Civettictis civetta" },
  { name:"Common genet",        continent:"Africa",        sciName:"Genetta genetta" },
  { name:"Rock hyrax",          continent:"Africa",        sciName:"Procavia capensis" },
  { name:"Cape porcupine",      continent:"Africa",        sciName:"Hystrix africaeaustralis" },
  { name:"Yellow mongoose",     continent:"Africa",        sciName:"Cynictis penicillata" },
  { name:"African clawless otter", continent:"Africa",     sciName:"Aonyx capensis" },
  { name:"Marabou stork",       continent:"Africa",        sciName:"Leptoptilos crumenifer" },
  { name:"Kori bustard",        continent:"Africa",        sciName:"Ardeotis kori" },
  { name:"Bateleur",            continent:"Africa",        sciName:"Terathopius ecaudatus" },
  { name:"Saddle-billed stork", continent:"Africa",        sciName:"Ephippiorhynchus senegalensis" },
  { name:"Lilac-breasted roller", continent:"Africa",      sciName:"Coracias caudatus" },
  { name:"Ground pangolin",     continent:"Africa",        sciName:"Smutsia temminckii" },
  { name:"Lappet-faced vulture",continent:"Africa",        sciName:"Torgos tracheliotos" },
  { name:"African wild cat",    continent:"Africa",        sciName:"Felis lybica" },
  { name:"Nile monitor",        continent:"Africa",        sciName:"Varanus niloticus" },
  { name:"Pygmy hippopotamus",  continent:"Africa",        sciName:"Choeropsis liberiensis" },
  { name:"White rhinoceros",    continent:"Africa",        sciName:"Ceratotherium simum" },
  { name:"Bonobo",              continent:"Africa",        sciName:"Pan paniscus" },
  { name:"Common chimpanzee",   continent:"Africa",        sciName:"Pan troglodytes" },
  { name:"Olive baboon",        continent:"Africa",        sciName:"Papio anubis" },
  { name:"African bullfrog",    continent:"Africa",        sciName:"Pyxicephalus adspersus" },
  { name:"Black mamba",         continent:"Africa",        sciName:"Dendroaspis polylepis" },
  { name:"Gelada",              continent:"Africa",        sciName:"Theropithecus gelada" },
  { name:"Great white shark",   continent:"Africa",        sciName:"Carcharodon carcharias" },
  { name:"Hammerhead shark",    continent:"Africa",        sciName:"Sphyrna lewini" },

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
  { name:"Amur leopard",        continent:"Asia",          sciName:"Panthera pardus orientalis" },
  { name:"Asian black bear",    continent:"Asia",          sciName:"Ursus thibetanus" },
  { name:"Dhole",               continent:"Asia",          sciName:"Cuon alpinus" },
  { name:"Fishing cat",         continent:"Asia",          sciName:"Prionailurus viverrinus" },
  { name:"Irrawaddy dolphin",   continent:"Asia",          sciName:"Orcaella brevirostris" },
  { name:"Dugong",              continent:"Asia",          sciName:"Dugong dugon" },
  { name:"Asian small-clawed otter", continent:"Asia",     sciName:"Aonyx cinereus" },
  { name:"Indian flying fox",   continent:"Asia",          sciName:"Pteropus giganteus" },
  { name:"Golden snub-nosed monkey", continent:"Asia",     sciName:"Rhinopithecus roxellana" },
  { name:"Tibetan fox",         continent:"Asia",          sciName:"Vulpes ferrilata" },
  { name:"Tibetan antelope",    continent:"Asia",          sciName:"Pantholops hodgsonii" },
  { name:"Kiang",               continent:"Asia",          sciName:"Equus kiang" },
  { name:"Himalayan tahr",      continent:"Asia",          sciName:"Hemitragus jemlahicus" },
  { name:"Gaur",                continent:"Asia",          sciName:"Bos gaurus" },
  { name:"Chinese alligator",   continent:"Asia",          sciName:"Alligator sinensis" },
  { name:"Indian python",       continent:"Asia",          sciName:"Python molurus" },
  { name:"Reticulated python",  continent:"Asia",          sciName:"Malayopython reticulatus" },
  { name:"Javan rhinoceros",    continent:"Asia",          sciName:"Rhinoceros sondaicus" },
  { name:"Sumatran rhinoceros", continent:"Asia",          sciName:"Dicerorhinus sumatrensis" },
  { name:"Pig-tailed macaque",  continent:"Asia",          sciName:"Macaca nemestrina" },
  { name:"Lar gibbon",          continent:"Asia",          sciName:"Hylobates lar" },
  { name:"Sumatran tiger",      continent:"Asia",          sciName:"Panthera tigris sumatrae" },
  { name:"Asian water buffalo", continent:"Asia",          sciName:"Bubalus bubalis" },
  { name:"Bali myna",           continent:"Asia",          sciName:"Leucopsar rothschildi" },
  { name:"Sunda pangolin",      continent:"Asia",          sciName:"Manis javanica" },
  { name:"Indian star tortoise",continent:"Asia",          sciName:"Geochelone elegans" },
  { name:"Whale shark",         continent:"Asia",          sciName:"Rhincodon typus" },
  { name:"Manta ray",           continent:"Asia",          sciName:"Mobula birostris" },
  { name:"Lionfish",            continent:"Asia",          sciName:"Pterois volitans" },

  // EUROPE
  { name:"Brown bear",          continent:"Europe",        sciName:"Ursus arctos" },
  { name:"European bison",      continent:"Europe",        sciName:"Bison bonasus" },
  { name:"Grey wolf",           continent:"Europe",        sciName:"Canis lupus" },
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
  { name:"Wolverine",           continent:"Europe",        sciName:"Gulo gulo" },
  { name:"European mink",       continent:"Europe",        sciName:"Mustela lutreola" },
  { name:"Mouflon",             continent:"Europe",        sciName:"Ovis gmelini" },
  { name:"Red deer",            continent:"Europe",        sciName:"Cervus elaphus" },
  { name:"Fallow deer",         continent:"Europe",        sciName:"Dama dama" },
  { name:"Reindeer",            continent:"Europe",        sciName:"Rangifer tarandus" },
  { name:"Arctic fox",          continent:"Europe",        sciName:"Vulpes lagopus" },
  { name:"Golden eagle",        continent:"Europe",        sciName:"Aquila chrysaetos" },
  { name:"White-tailed eagle",  continent:"Europe",        sciName:"Haliaeetus albicilla" },
  { name:"Peregrine falcon",    continent:"Europe",        sciName:"Falco peregrinus" },
  { name:"Common kingfisher",   continent:"Europe",        sciName:"Alcedo atthis" },
  { name:"European bee-eater",  continent:"Europe",        sciName:"Merops apiaster" },
  { name:"Hoopoe",              continent:"Europe",        sciName:"Upupa epops" },
  { name:"Common crane",        continent:"Europe",        sciName:"Grus grus" },
  { name:"Eurasian spoonbill",  continent:"Europe",        sciName:"Platalea leucorodia" },
  { name:"European badger",     continent:"Europe",        sciName:"Meles meles" },
  { name:"Stone marten",        continent:"Europe",        sciName:"Martes foina" },
  { name:"European polecat",    continent:"Europe",        sciName:"Mustela putorius" },
  { name:"Common kestrel",      continent:"Europe",        sciName:"Falco tinnunculus" },
  { name:"Black stork",         continent:"Europe",        sciName:"Ciconia nigra" },
  { name:"Great grey owl",      continent:"Europe",        sciName:"Strix nebulosa" },
  { name:"Bottlenose dolphin",  continent:"Europe",        sciName:"Tursiops truncatus" },
  { name:"Loggerhead sea turtle", continent:"Europe",      sciName:"Caretta caretta" },
  { name:"Mediterranean monk seal", continent:"Europe",    sciName:"Monachus monachus" },
  { name:"Common octopus",      continent:"Europe",        sciName:"Octopus vulgaris" },

  // NORTH AMERICA
  { name:"Grizzly bear",        continent:"North America", sciName:"Ursus arctos horribilis" },
  { name:"American bison",      continent:"North America", sciName:"Bison bison" },
  { name:"Moose",               continent:"North America", sciName:"Alces alces" },
  { name:"White-tailed deer",   continent:"North America", sciName:"Odocoileus virginianus" },
  { name:"Bald eagle",          continent:"North America", sciName:"Haliaeetus leucocephalus" },
  { name:"American alligator",  continent:"North America", sciName:"Alligator mississippiensis" },
  { name:"Cougar",              continent:"North America", sciName:"Puma concolor" },
  { name:"American black bear", continent:"North America", sciName:"Ursus americanus" },
  { name:"American pronghorn",  continent:"North America", sciName:"Antilocapra americana" },
  { name:"California condor",   continent:"North America", sciName:"Gymnogyps californianus" },
  { name:"North American river otter", continent:"North America", sciName:"Lontra canadensis" },
  { name:"Wild turkey",         continent:"North America", sciName:"Meleagris gallopavo" },
  { name:"Striped skunk",       continent:"North America", sciName:"Mephitis mephitis" },
  { name:"Virginia opossum",    continent:"North America", sciName:"Didelphis virginiana" },
  { name:"American beaver",     continent:"North America", sciName:"Castor canadensis" },
  { name:"Common raccoon",      continent:"North America", sciName:"Procyon lotor" },
  { name:"Black-tailed prairie dog", continent:"North America", sciName:"Cynomys ludovicianus" },
  { name:"Nine-banded armadillo", continent:"North America", sciName:"Dasypus novemcinctus" },
  { name:"Sea otter",           continent:"North America", sciName:"Enhydra lutris" },
  { name:"Northern elephant seal", continent:"North America", sciName:"Mirounga angustirostris" },
  { name:"Snowy owl",           continent:"North America", sciName:"Bubo scandiacus" },
  { name:"American badger",     continent:"North America", sciName:"Taxidea taxus" },
  { name:"Bobcat",              continent:"North America", sciName:"Lynx rufus" },
  { name:"Canada lynx",         continent:"North America", sciName:"Lynx canadensis" },
  { name:"Polar bear",          continent:"North America", sciName:"Ursus maritimus" },
  { name:"Musk ox",             continent:"North America", sciName:"Ovibos moschatus" },
  { name:"Walrus",              continent:"North America", sciName:"Odobenus rosmarus" },
  { name:"Harbor seal",         continent:"North America", sciName:"Phoca vitulina" },
  { name:"Steller sea lion",    continent:"North America", sciName:"Eumetopias jubatus" },
  { name:"American mink",       continent:"North America", sciName:"Neovison vison" },
  { name:"Whooping crane",      continent:"North America", sciName:"Grus americana" },
  { name:"Sandhill crane",      continent:"North America", sciName:"Antigone canadensis" },
  { name:"Great blue heron",    continent:"North America", sciName:"Ardea herodias" },
  { name:"Roseate spoonbill",   continent:"North America", sciName:"Platalea ajaja" },
  { name:"Wood duck",           continent:"North America", sciName:"Aix sponsa" },
  { name:"American pika",       continent:"North America", sciName:"Ochotona princeps" },
  { name:"Mountain goat",       continent:"North America", sciName:"Oreamnos americanus" },
  { name:"Bighorn sheep",       continent:"North America", sciName:"Ovis canadensis" },
  { name:"Eastern box turtle",  continent:"North America", sciName:"Terrapene carolina" },
  { name:"American bullfrog",   continent:"North America", sciName:"Lithobates catesbeianus" },
  { name:"Northern mockingbird",continent:"North America", sciName:"Mimus polyglottos" },
  { name:"Ruby-throated hummingbird", continent:"North America", sciName:"Archilochus colubris" },
  { name:"Sperm whale",         continent:"North America", sciName:"Physeter macrocephalus" },
  { name:"Narwhal",             continent:"North America", sciName:"Monodon monoceros" },
  { name:"Beluga whale",        continent:"North America", sciName:"Delphinapterus leucas" },
  { name:"Giant Pacific octopus", continent:"North America", sciName:"Enteroctopus dofleini" },

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
  { name:"Patagonian mara",     continent:"South America", sciName:"Dolichotis patagonum" },
  { name:"South American coati",continent:"South America", sciName:"Nasua nasua" },
  { name:"Andean condor",       continent:"South America", sciName:"Vultur gryphus" },
  { name:"Jabiru",              continent:"South America", sciName:"Jabiru mycteria" },
  { name:"Scarlet macaw",       continent:"South America", sciName:"Ara macao" },
  { name:"Blue-and-yellow macaw", continent:"South America", sciName:"Ara ararauna" },
  { name:"Hyacinth macaw",      continent:"South America", sciName:"Anodorhynchus hyacinthinus" },
  { name:"Hoatzin",             continent:"South America", sciName:"Opisthocomus hoazin" },
  { name:"Scarlet ibis",        continent:"South America", sciName:"Eudocimus ruber" },
  { name:"Andean flamingo",     continent:"South America", sciName:"Phoenicoparrus andinus" },
  { name:"Chilean flamingo",    continent:"South America", sciName:"Phoenicopterus chilensis" },
  { name:"Black-necked swan",   continent:"South America", sciName:"Cygnus melancoryphus" },
  { name:"Darwin's rhea",       continent:"South America", sciName:"Rhea pennata" },
  { name:"Mountain tapir",      continent:"South America", sciName:"Tapirus pinchaque" },
  { name:"Matamata",            continent:"South America", sciName:"Chelus fimbriata" },
  { name:"South American sea lion", continent:"South America", sciName:"Otaria flavescens" },
  { name:"Leatherback sea turtle", continent:"South America", sciName:"Dermochelys coriacea" },

  // AUSTRALIA / OCEANIA
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
  { name:"Eastern grey kangaroo", continent:"Australia",   sciName:"Macropus giganteus" },
  { name:"Tree kangaroo",       continent:"Australia",     sciName:"Dendrolagus lumholtzi" },
  { name:"Wallaby",             continent:"Australia",     sciName:"Notamacropus agilis" },
  { name:"Common brushtail possum", continent:"Australia", sciName:"Trichosurus vulpecula" },
  { name:"Spotted-tailed quoll",continent:"Australia",     sciName:"Dasyurus maculatus" },
  { name:"Tawny frogmouth",     continent:"Australia",     sciName:"Podargus strigoides" },
  { name:"Brolga",              continent:"Australia",     sciName:"Antigone rubicunda" },
  { name:"Australian pelican",  continent:"Australia",     sciName:"Pelecanus conspicillatus" },
  { name:"Sulphur-crested cockatoo", continent:"Australia",sciName:"Cacatua galerita" },
  { name:"Australian magpie",   continent:"Australia",     sciName:"Gymnorhina tibicen" },
  { name:"Galah",               continent:"Australia",     sciName:"Eolophus roseicapilla" },
  { name:"Superb fairywren",    continent:"Australia",     sciName:"Malurus cyaneus" },
  { name:"Kakapo",              continent:"Australia",     sciName:"Strigops habroptilus" },
  { name:"Kiwi",                continent:"Australia",     sciName:"Apteryx australis" },
  { name:"Tuatara",             continent:"Australia",     sciName:"Sphenodon punctatus" },
  { name:"Green sea turtle",    continent:"Australia",     sciName:"Chelonia mydas" },
  { name:"Clownfish",           continent:"Australia",     sciName:"Amphiprion ocellaris" },

  // ANTARCTICA
  { name:"Emperor penguin",     continent:"Antarctica",    sciName:"Aptenodytes forsteri" },
  { name:"King penguin",        continent:"Antarctica",    sciName:"Aptenodytes patagonicus" },
  { name:"Chinstrap penguin",   continent:"Antarctica",    sciName:"Pygoscelis antarcticus" },
  { name:"Gentoo penguin",      continent:"Antarctica",    sciName:"Pygoscelis papua" },
  { name:"Adélie penguin",      continent:"Antarctica",    sciName:"Pygoscelis adeliae" },
  { name:"Macaroni penguin",    continent:"Antarctica",    sciName:"Eudyptes chrysolophus" },
  { name:"Leopard seal",        continent:"Antarctica",    sciName:"Hydrurga leptonyx" },
  { name:"Weddell seal",        continent:"Antarctica",    sciName:"Leptonychotes weddellii" },
  { name:"Crabeater seal",      continent:"Antarctica",    sciName:"Lobodon carcinophaga" },
  { name:"Antarctic fur seal",  continent:"Antarctica",    sciName:"Arctocephalus gazella" },
  { name:"Southern elephant seal", continent:"Antarctica", sciName:"Mirounga leonina" },
  { name:"Snow petrel",         continent:"Antarctica",    sciName:"Pagodroma nivea" },
  { name:"South Polar skua",    continent:"Antarctica",    sciName:"Stercorarius maccormicki" },
  { name:"Orca",                continent:"Antarctica",    sciName:"Orcinus orca" },
  { name:"Humpback whale",      continent:"Antarctica",    sciName:"Megaptera novaeangliae" },
  { name:"Blue whale",          continent:"Antarctica",    sciName:"Balaenoptera musculus" },
];

// ---------------------------------------------------------------------------
// Wikipedia Summary API fetch
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
  if (summary.thumbnail?.source) return summary.thumbnail.source.replace(/\/\d+px-/, '/500px-');
  return null;
}

function extractFact(summary) {
  const extract = summary.extract || '';
  const first = extract.split(/\.\s+/)[0];
  if (!first || first.length < 30) return null;
  // Remove parentheticals like "(Panthera leo)" or "(also known as...)"
  let fact = first.replace(/\s*\([^)]*\)/g, '').trim();
  if (!fact.endsWith('.')) fact += '.';
  return fact.length >= 30 ? fact : null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`Generating animals.json from ${ANIMALS_SEED.length} seeds…\n`);

  const results = [];
  const seen    = new Set();
  let ok = 0, skip = 0;

  const BATCH = 6;
  for (let i = 0; i < ANIMALS_SEED.length; i += BATCH) {
    const batch = ANIMALS_SEED.slice(i, i + BATCH);
    await Promise.all(batch.map(async seed => {
      if (seen.has(seed.name)) { skip++; return; }
      seen.add(seed.name);

      const summary = await fetchSummaryWithRetry(seed.name);
      if (!summary) { console.log(`  – skip (no article): ${seed.name}`); skip++; return; }

      const imageUrl = buildImageUrl(summary);
      if (!imageUrl) { console.log(`  – skip (no image):   ${seed.name}`); skip++; return; }

      const id = summary.wikibase_item
        ? `http://www.wikidata.org/entity/${summary.wikibase_item}`
        : `https://en.wikipedia.org/wiki/${encodeURIComponent(seed.name)}`;

      results.push({
        id,
        label:     seed.name,
        imageUrl,
        continent: seed.continent,
        sciName:   seed.sciName,
        fact:      extractFact(summary),
      });
      ok++;
    }));

    process.stdout.write(`\r  ${Math.min(i + BATCH, ANIMALS_SEED.length)}/${ANIMALS_SEED.length}  ok:${ok}`);
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n\n=== HOTOVO ===`);
  console.log(`Úspešných: ${ok}  /  Preskočených: ${skip}`);

  const byCont = {};
  for (const a of results) byCont[a.continent] = (byCont[a.continent] || 0) + 1;
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
