// server/config/packages.js — gói dung lượng (§0.2 ANDECK_PAYMENT_ROADMAP)
const PACKAGES = {
  goi1: {
    id: 'goi1',
    name: 'Gói 1',
    price: 15000,
    priceLabel: '15.000đ',
    deckAdd: 10,
    wordAdd: 1000
  },
  goi2: {
    id: 'goi2',
    name: 'Gói 2',
    price: 28000,
    priceLabel: '28.000đ',
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
