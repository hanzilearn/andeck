// server/config/packages.js — gói dung lượng (§0.2 ANDECK_PAYMENT_ROADMAP)
const PACKAGES = {
  goi1: {
    id: 'goi1',
    name: 'Gói 1',
    price: 17000,
    priceLabel: '17.000đ',
    deckAdd: 10,
    wordAdd: 1000
  },
  goi2: {
    id: 'goi2',
    name: 'Gói 2',
    price: 29000,
    priceLabel: '29.000đ',
    deckAdd: 20,
    wordAdd: 2000
  }
};

function getPackage(id) {
  return PACKAGES[id] || null;
}

function listPackages() {
  return Object.values(PACKAGES);
}

module.exports = { PACKAGES, getPackage, listPackages };
