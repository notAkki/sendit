-- Import the 2026 trip export into one existing Sendit room.
-- Run this entire file in the Supabase SQL Editor after replacing target_code below.
--
-- Safety and repeatability:
--   * Only the exact room code below is touched.
--   * Existing [Demo] expenses/payments and earlier runs of this import are replaced.
--   * Other non-demo expenses and payments are preserved.
--   * The room must use USD as its base accounting currency.
--
-- Import notes:
--   * The export contains 80 expenses and no recorded repayments.
--   * The sole EUR expense uses Frankfurter's historical EUR -> USD rate of
--     1.1674 for 2026-08-26.
--   * Where rounded source shares do not exactly equal the expense total, the
--     final listed share absorbs the residual so Sendit's ledger stays exact.
--   * Converted USD totals and allocations are rounded to cents using the same
--     largest-remainder method as Sendit's normal expense form.

do $seed$
declare
  target_code constant text := 'PASTE-ROOM-CODE-HERE';
  eur_to_usd_rate constant numeric(24, 12) := 1.1674;
  participant_names constant jsonb := '[
    "Akshar Barot",
    "Krish Patel",
    "Krish Modi",
    "Krish Shah",
    "Darsh Shah"
  ]'::jsonb;
  seed_data constant jsonb := $expenses$
[
  {
    "title": "ATM Charge Prague",
    "date": "2026-09-05",
    "payer": "Akshar Barot",
    "currency": "USD",
    "amount": "7.20",
    "splits": [
      [
        "Akshar Barot",
        "1.44"
      ],
      [
        "Krish Patel",
        "1.44"
      ],
      [
        "Krish Modi",
        "1.44"
      ],
      [
        "Krish Shah",
        "1.44"
      ],
      [
        "Darsh Shah",
        "1.44"
      ]
    ]
  },
  {
    "title": "Ice Cream Prague (I believe it was 55czk per but lmk if Im wrong)",
    "date": "2026-09-05",
    "payer": "Akshar Barot",
    "currency": "USD",
    "amount": "10.56",
    "splits": [
      [
        "Krish Patel",
        "2.64"
      ],
      [
        "Akshar Barot",
        "2.64"
      ],
      [
        "Krish Modi",
        "2.64"
      ],
      [
        "Krish Shah",
        "2.64"
      ]
    ]
  },
  {
    "title": "Taco Bell in Getafe",
    "date": "2026-09-05",
    "payer": "Akshar Barot",
    "currency": "USD",
    "amount": "13.66",
    "splits": [
      [
        "Darsh Shah",
        "13.66"
      ]
    ]
  },
  {
    "title": "Vrtba Garden",
    "date": "2026-09-05",
    "payer": "Akshar Barot",
    "currency": "USD",
    "amount": "10.56",
    "splits": [
      [
        "Akshar Barot",
        "5.28"
      ],
      [
        "Krish Patel",
        "5.28"
      ]
    ]
  },
  {
    "title": "Spain Lunch - Indian",
    "date": "2026-09-05",
    "payer": "Darsh Shah",
    "currency": "USD",
    "amount": "66.54",
    "splits": [
      [
        "Akshar Barot",
        "19.93"
      ],
      [
        "Krish Modi",
        "20.57"
      ],
      [
        "Darsh Shah",
        "26.03"
      ]
    ]
  },
  {
    "title": "Museum tickets",
    "date": "2026-09-05",
    "payer": "Krish Shah",
    "currency": "USD",
    "amount": "44.13",
    "splits": [
      [
        "Krish Patel",
        "22.07"
      ],
      [
        "Krish Shah",
        "22.07"
      ]
    ]
  },
  {
    "title": "Amsterdam Main Museum",
    "date": "2026-09-04",
    "payer": "Krish Patel",
    "currency": "USD",
    "amount": "58.22",
    "splits": [
      [
        "Krish Patel",
        "29.11"
      ],
      [
        "Krish Shah",
        "29.11"
      ]
    ]
  },
  {
    "title": "Hopp - Airport to Office",
    "date": "2026-09-04",
    "payer": "Darsh Shah",
    "currency": "USD",
    "amount": "34.87",
    "splits": [
      [
        "Akshar Barot",
        "11.62"
      ],
      [
        "Krish Modi",
        "11.62"
      ],
      [
        "Darsh Shah",
        "11.62"
      ]
    ]
  },
  {
    "title": "Hopp - Airport",
    "date": "2026-09-04",
    "payer": "Darsh Shah",
    "currency": "USD",
    "amount": "24.64",
    "splits": [
      [
        "Akshar Barot",
        "4.93"
      ],
      [
        "Krish Patel",
        "4.93"
      ],
      [
        "Krish Modi",
        "4.93"
      ],
      [
        "Krish Shah",
        "4.93"
      ],
      [
        "Darsh Shah",
        "4.93"
      ]
    ]
  },
  {
    "title": "Jerusalem Synagogue",
    "date": "2026-09-04",
    "payer": "Darsh Shah",
    "currency": "USD",
    "amount": "24.22",
    "splits": [
      [
        "Akshar Barot",
        "4.84"
      ],
      [
        "Krish Patel",
        "4.84"
      ],
      [
        "Krish Modi",
        "4.84"
      ],
      [
        "Krish Shah",
        "4.84"
      ],
      [
        "Darsh Shah",
        "4.84"
      ]
    ]
  },
  {
    "title": "Narodni Museum",
    "date": "2026-09-04",
    "payer": "Darsh Shah",
    "currency": "USD",
    "amount": "62.45",
    "splits": [
      [
        "Krish Patel",
        "12.49"
      ],
      [
        "Akshar Barot",
        "12.49"
      ],
      [
        "Krish Modi",
        "12.49"
      ],
      [
        "Krish Shah",
        "12.49"
      ],
      [
        "Darsh Shah",
        "12.49"
      ]
    ]
  },
  {
    "title": "Prague Dinner - Indian",
    "date": "2026-09-04",
    "payer": "Darsh Shah",
    "currency": "USD",
    "amount": "83.16",
    "splits": [
      [
        "Akshar Barot",
        "18.02"
      ],
      [
        "Krish Patel",
        "15.57"
      ],
      [
        "Krish Modi",
        "15.57"
      ],
      [
        "Krish Shah",
        "15.13"
      ],
      [
        "Darsh Shah",
        "18.88"
      ]
    ]
  },
  {
    "title": "Prague Dinner",
    "date": "2026-09-04",
    "payer": "Darsh Shah",
    "currency": "USD",
    "amount": "96.26",
    "splits": [
      [
        "Akshar Barot",
        "17.46"
      ],
      [
        "Krish Patel",
        "17.46"
      ],
      [
        "Krish Modi",
        "17.89"
      ],
      [
        "Krish Shah",
        "25.99"
      ],
      [
        "Darsh Shah",
        "17.26"
      ]
    ]
  },
  {
    "title": "Prague Vitus Cathedral",
    "date": "2026-09-03",
    "payer": "Krish Patel",
    "currency": "USD",
    "amount": "28.79",
    "splits": [
      [
        "Krish Patel",
        "14.40"
      ],
      [
        "Krish Shah",
        "14.40"
      ]
    ]
  },
  {
    "title": "Amsterdam Dinner Day 1",
    "date": "2026-09-03",
    "payer": "Krish Patel",
    "currency": "USD",
    "amount": "27.32",
    "splits": [
      [
        "Krish Patel",
        "13.66"
      ],
      [
        "Krish Shah",
        "13.66"
      ]
    ]
  },
  {
    "title": "Stasher Prague",
    "date": "2026-09-03",
    "payer": "Krish Shah",
    "currency": "USD",
    "amount": "15.08",
    "splits": [
      [
        "Krish Patel",
        "7.54"
      ],
      [
        "Krish Shah",
        "7.54"
      ]
    ]
  },
  {
    "title": "Uber to Prague Airport",
    "date": "2026-09-03",
    "payer": "Krish Shah",
    "currency": "USD",
    "amount": "18.94",
    "splits": [
      [
        "Krish Patel",
        "9.47"
      ],
      [
        "Krish Shah",
        "9.47"
      ]
    ]
  },
  {
    "title": "Uber from Prague Airport",
    "date": "2026-09-01",
    "payer": "Krish Shah",
    "currency": "USD",
    "amount": "36.33",
    "splits": [
      [
        "Akshar Barot",
        "7.27"
      ],
      [
        "Krish Patel",
        "7.27"
      ],
      [
        "Krish Modi",
        "7.27"
      ],
      [
        "Krish Shah",
        "7.27"
      ],
      [
        "Darsh Shah",
        "7.27"
      ]
    ]
  },
  {
    "title": "Airport Lunch - Larnaka",
    "date": "2026-09-01",
    "payer": "Darsh Shah",
    "currency": "USD",
    "amount": "90.31",
    "splits": [
      [
        "Akshar Barot",
        "16.47"
      ],
      [
        "Krish Patel",
        "19.43"
      ],
      [
        "Krish Modi",
        "12.47"
      ],
      [
        "Krish Shah",
        "21.69"
      ],
      [
        "Darsh Shah",
        "20.24"
      ]
    ]
  },
  {
    "title": "Uber to Larnaka Airpirt",
    "date": "2026-09-01",
    "payer": "Krish Shah",
    "currency": "USD",
    "amount": "92.76",
    "splits": [
      [
        "Akshar Barot",
        "18.55"
      ],
      [
        "Krish Patel",
        "18.55"
      ],
      [
        "Krish Modi",
        "18.55"
      ],
      [
        "Krish Shah",
        "18.55"
      ],
      [
        "Darsh Shah",
        "18.55"
      ]
    ]
  },
  {
    "title": "Gun game",
    "date": "2026-09-01",
    "payer": "Akshar Barot",
    "currency": "USD",
    "amount": "11.66",
    "splits": [
      [
        "Akshar Barot",
        "5.83"
      ],
      [
        "Krish Modi",
        "5.83"
      ]
    ]
  },
  {
    "title": "Pizza Dinner Ayia Napa",
    "date": "2026-09-01",
    "payer": "Akshar Barot",
    "currency": "USD",
    "amount": "12.83",
    "splits": [
      [
        "Akshar Barot",
        "6.42"
      ],
      [
        "Darsh Shah",
        "6.42"
      ]
    ]
  },
  {
    "title": "Pasta - Athens",
    "date": "2026-09-01",
    "payer": "Darsh Shah",
    "currency": "USD",
    "amount": "74.46",
    "splits": [
      [
        "Darsh Shah",
        "10.24"
      ],
      [
        "Krish Shah",
        "17.79"
      ],
      [
        "Krish Modi",
        "17.79"
      ],
      [
        "Krish Patel",
        "17.79"
      ],
      [
        "Akshar Barot",
        "10.83"
      ]
    ]
  },
  {
    "title": "Uber to Athens Airport",
    "date": "2026-09-01",
    "payer": "Akshar Barot",
    "currency": "USD",
    "amount": "11.66",
    "splits": [
      [
        "Akshar Barot",
        "2.33"
      ],
      [
        "Krish Patel",
        "2.33"
      ],
      [
        "Krish Modi",
        "2.33"
      ],
      [
        "Krish Shah",
        "2.33"
      ],
      [
        "Darsh Shah",
        "2.33"
      ]
    ]
  },
  {
    "title": "Bus from LCA to Aiya Napa",
    "date": "2026-09-01",
    "payer": "Krish Modi",
    "currency": "USD",
    "amount": "75.35",
    "splits": [
      [
        "Akshar Barot",
        "15.07"
      ],
      [
        "Krish Patel",
        "15.07"
      ],
      [
        "Krish Modi",
        "15.07"
      ],
      [
        "Krish Shah",
        "15.07"
      ],
      [
        "Darsh Shah",
        "15.07"
      ]
    ]
  },
  {
    "title": "Taco Bell - Athens",
    "date": "2026-09-01",
    "payer": "Darsh Shah",
    "currency": "USD",
    "amount": "86.56",
    "splits": [
      [
        "Darsh Shah",
        "18.77"
      ],
      [
        "Krish Shah",
        "20.74"
      ],
      [
        "Krish Modi",
        "17.25"
      ],
      [
        "Krish Patel",
        "12.74"
      ],
      [
        "Akshar Barot",
        "16.57"
      ]
    ]
  },
  {
    "title": "Volleyball in Cyprus",
    "date": "2026-09-01",
    "payer": "Darsh Shah",
    "currency": "USD",
    "amount": "6.98",
    "splits": [
      [
        "Akshar Barot",
        "1.40"
      ],
      [
        "Krish Patel",
        "1.40"
      ],
      [
        "Krish Modi",
        "1.40"
      ],
      [
        "Krish Shah",
        "1.40"
      ],
      [
        "Darsh Shah",
        "1.40"
      ]
    ]
  },
  {
    "title": "Rhino Vegan Athens",
    "date": "2026-08-31",
    "payer": "Krish Patel",
    "currency": "USD",
    "amount": "37.80",
    "splits": [
      [
        "Akshar Barot",
        "10.90"
      ],
      [
        "Krish Patel",
        "10.90"
      ],
      [
        "Darsh Shah",
        "8.00"
      ],
      [
        "Krish Shah",
        "8.00"
      ]
    ]
  },
  {
    "title": "Lunch at Freij Resort",
    "date": "2026-08-31",
    "payer": "Krish Patel",
    "currency": "USD",
    "amount": "60.58",
    "splits": [
      [
        "Akshar Barot",
        "12.12"
      ],
      [
        "Krish Patel",
        "12.12"
      ],
      [
        "Krish Modi",
        "12.12"
      ],
      [
        "Krish Shah",
        "12.12"
      ],
      [
        "Darsh Shah",
        "12.12"
      ]
    ]
  },
  {
    "title": "Aiya Napa from airport bus",
    "date": "2026-08-31",
    "payer": "Krish Modi",
    "currency": "USD",
    "amount": "75.41",
    "splits": [
      [
        "Akshar Barot",
        "15.08"
      ],
      [
        "Krish Patel",
        "15.08"
      ],
      [
        "Krish Modi",
        "15.08"
      ],
      [
        "Krish Shah",
        "15.08"
      ],
      [
        "Darsh Shah",
        "15.08"
      ]
    ]
  },
  {
    "title": "Uber to Athens Airport Bus",
    "date": "2026-08-31",
    "payer": "Krish Shah",
    "currency": "USD",
    "amount": "16.16",
    "splits": [
      [
        "Akshar Barot",
        "3.23"
      ],
      [
        "Krish Patel",
        "3.23"
      ],
      [
        "Krish Modi",
        "3.23"
      ],
      [
        "Krish Shah",
        "3.23"
      ],
      [
        "Darsh Shah",
        "3.23"
      ]
    ]
  },
  {
    "title": "Taxi to Athens Hotel",
    "date": "2026-08-31",
    "payer": "Krish Shah",
    "currency": "USD",
    "amount": "86.91",
    "splits": [
      [
        "Akshar Barot",
        "17.38"
      ],
      [
        "Krish Patel",
        "17.38"
      ],
      [
        "Krish Modi",
        "17.38"
      ],
      [
        "Krish Shah",
        "17.38"
      ],
      [
        "Darsh Shah",
        "17.38"
      ]
    ]
  },
  {
    "title": "Mykonos Bus Round Trip",
    "date": "2026-08-29",
    "payer": "Krish Shah",
    "currency": "USD",
    "amount": "46.34",
    "splits": [
      [
        "Akshar Barot",
        "9.27"
      ],
      [
        "Krish Patel",
        "9.27"
      ],
      [
        "Krish Modi",
        "9.27"
      ],
      [
        "Krish Shah",
        "9.27"
      ],
      [
        "Darsh Shah",
        "9.27"
      ]
    ]
  },
  {
    "title": "Volleyball",
    "date": "2026-08-29",
    "payer": "Darsh Shah",
    "currency": "USD",
    "amount": "19.79",
    "splits": [
      [
        "Akshar Barot",
        "3.96"
      ],
      [
        "Krish Patel",
        "3.96"
      ],
      [
        "Krish Modi",
        "3.96"
      ],
      [
        "Krish Shah",
        "3.96"
      ],
      [
        "Darsh Shah",
        "3.96"
      ]
    ]
  },
  {
    "title": "Laranaka -> Prague",
    "date": "2026-08-29",
    "payer": "Krish Shah",
    "currency": "USD",
    "amount": "304.60",
    "splits": [
      [
        "Darsh Shah",
        "188.95"
      ],
      [
        "Krish Shah",
        "115.65"
      ]
    ]
  },
  {
    "title": "Athens to Laranaka",
    "date": "2026-08-29",
    "payer": "Krish Shah",
    "currency": "USD",
    "amount": "433.00",
    "splits": [
      [
        "Darsh Shah",
        "250.23"
      ],
      [
        "Krish Shah",
        "182.77"
      ]
    ]
  },
  {
    "title": "Modi DTw -> ATH",
    "date": "2026-08-29",
    "payer": "Krish Modi",
    "currency": "USD",
    "amount": "439.00",
    "splits": [
      [
        "Krish Modi",
        "439.00"
      ]
    ]
  },
  {
    "title": "Cruise to Athens",
    "date": "2026-08-29",
    "payer": "Krish Shah",
    "currency": "USD",
    "amount": "174.09",
    "splits": [
      [
        "Darsh Shah",
        "87.05"
      ],
      [
        "Krish Shah",
        "87.05"
      ]
    ]
  },
  {
    "title": "Mykonos Falafel Lunch (delivery)",
    "date": "2026-08-29",
    "payer": "Krish Patel",
    "currency": "USD",
    "amount": "60.20",
    "splits": [
      [
        "Darsh Shah",
        "9.84"
      ],
      [
        "Akshar Barot",
        "9.84"
      ],
      [
        "Krish Modi",
        "14.47"
      ],
      [
        "Krish Shah",
        "14.47"
      ],
      [
        "Krish Patel",
        "11.58"
      ]
    ]
  },
  {
    "title": "Mykonos Pizza Dinner",
    "date": "2026-08-29",
    "payer": "Krish Patel",
    "currency": "USD",
    "amount": "68.63",
    "splits": [
      [
        "Akshar Barot",
        "13.73"
      ],
      [
        "Krish Patel",
        "13.73"
      ],
      [
        "Krish Modi",
        "13.73"
      ],
      [
        "Krish Shah",
        "13.73"
      ],
      [
        "Darsh Shah",
        "13.73"
      ]
    ]
  },
  {
    "title": "Uber",
    "date": "2026-08-29",
    "payer": "Krish Shah",
    "currency": "USD",
    "amount": "63.71",
    "splits": [
      [
        "Akshar Barot",
        "12.74"
      ],
      [
        "Krish Patel",
        "12.74"
      ],
      [
        "Krish Modi",
        "12.74"
      ],
      [
        "Krish Shah",
        "12.74"
      ],
      [
        "Darsh Shah",
        "12.74"
      ]
    ]
  },
  {
    "title": "Transport",
    "date": "2026-08-29",
    "payer": "Krish Shah",
    "currency": "USD",
    "amount": "35.91",
    "splits": [
      [
        "Akshar Barot",
        "7.18"
      ],
      [
        "Krish Patel",
        "7.18"
      ],
      [
        "Krish Modi",
        "7.18"
      ],
      [
        "Krish Shah",
        "7.18"
      ],
      [
        "Darsh Shah",
        "7.18"
      ]
    ]
  },
  {
    "title": "Lunch",
    "date": "2026-08-27",
    "payer": "Darsh Shah",
    "currency": "USD",
    "amount": "85.01",
    "splits": [
      [
        "Krish Modi",
        "17.53"
      ],
      [
        "Krish Shah",
        "17.51"
      ],
      [
        "Krish Patel",
        "17.51"
      ],
      [
        "Darsh Shah",
        "16.23"
      ],
      [
        "Akshar Barot",
        "16.23"
      ]
    ]
  },
  {
    "title": "Brunch Naxos",
    "date": "2026-08-27",
    "payer": "Krish Modi",
    "currency": "USD",
    "amount": "27.48",
    "splits": [
      [
        "Akshar Barot",
        "6.32"
      ],
      [
        "Krish Modi",
        "10.36"
      ],
      [
        "Darsh Shah",
        "5.40"
      ],
      [
        "Krish Shah",
        "5.40"
      ]
    ]
  },
  {
    "title": "Taxi Jason’s to Antonia Studios",
    "date": "2026-08-27",
    "payer": "Akshar Barot",
    "currency": "USD",
    "amount": "34.93",
    "splits": [
      [
        "Akshar Barot",
        "6.99"
      ],
      [
        "Krish Patel",
        "6.99"
      ],
      [
        "Krish Modi",
        "6.99"
      ],
      [
        "Krish Shah",
        "6.99"
      ],
      [
        "Darsh Shah",
        "6.99"
      ]
    ]
  },
  {
    "title": "Uber to Athens Port",
    "date": "2026-08-27",
    "payer": "Krish Modi",
    "currency": "USD",
    "amount": "19.10",
    "splits": [
      [
        "Akshar Barot",
        "3.82"
      ],
      [
        "Krish Patel",
        "3.82"
      ],
      [
        "Krish Modi",
        "3.82"
      ],
      [
        "Krish Shah",
        "3.82"
      ],
      [
        "Darsh Shah",
        "3.82"
      ]
    ]
  },
  {
    "title": "Taxi Athens to Port",
    "date": "2026-08-27",
    "payer": "Akshar Barot",
    "currency": "USD",
    "amount": "26.08",
    "splits": [
      [
        "Akshar Barot",
        "5.22"
      ],
      [
        "Krish Patel",
        "5.22"
      ],
      [
        "Krish Modi",
        "5.22"
      ],
      [
        "Krish Shah",
        "5.22"
      ],
      [
        "Darsh Shah",
        "5.22"
      ]
    ]
  },
  {
    "title": "Dinner",
    "date": "2026-08-27",
    "payer": "Krish Modi",
    "currency": "USD",
    "amount": "64.04",
    "splits": [
      [
        "Akshar Barot",
        "12.81"
      ],
      [
        "Krish Patel",
        "12.81"
      ],
      [
        "Krish Modi",
        "12.81"
      ],
      [
        "Darsh Shah",
        "12.81"
      ],
      [
        "Krish Shah",
        "12.81"
      ]
    ]
  },
  {
    "title": "Dinner",
    "date": "2026-08-27",
    "payer": "Darsh Shah",
    "currency": "USD",
    "amount": "85.81",
    "splits": [
      [
        "Darsh Shah",
        "16.35"
      ],
      [
        "Krish Patel",
        "16.35"
      ],
      [
        "Akshar Barot",
        "16.35"
      ],
      [
        "Krish Shah",
        "19.83"
      ],
      [
        "Krish Modi",
        "16.93"
      ]
    ]
  },
  {
    "title": "Uber",
    "date": "2026-08-27",
    "payer": "Krish Shah",
    "currency": "USD",
    "amount": "23.31",
    "splits": [
      [
        "Akshar Barot",
        "4.66"
      ],
      [
        "Krish Patel",
        "4.66"
      ],
      [
        "Krish Modi",
        "4.66"
      ],
      [
        "Krish Shah",
        "4.66"
      ],
      [
        "Darsh Shah",
        "4.66"
      ]
    ]
  },
  {
    "title": "Mykonos Cruise",
    "date": "2026-08-26",
    "payer": "Krish Shah",
    "currency": "USD",
    "amount": "113.11",
    "splits": [
      [
        "Krish Shah",
        "56.56"
      ],
      [
        "Darsh Shah",
        "56.56"
      ]
    ]
  },
  {
    "title": "Darsh Coffee",
    "date": "2026-08-26",
    "payer": "Krish Shah",
    "currency": "USD",
    "amount": "4.67",
    "splits": [
      [
        "Darsh Shah",
        "4.67"
      ]
    ]
  },
  {
    "title": "Air Canada Flight",
    "date": "2026-08-26",
    "payer": "Krish Shah",
    "currency": "USD",
    "amount": "1190.40",
    "splits": [
      [
        "Krish Patel",
        "396.80"
      ],
      [
        "Darsh Shah",
        "396.80"
      ],
      [
        "Krish Shah",
        "396.80"
      ]
    ]
  },
  {
    "title": "Darsh Checked Bag",
    "date": "2026-08-26",
    "payer": "Krish Shah",
    "currency": "USD",
    "amount": "64.90",
    "splits": [
      [
        "Darsh Shah",
        "64.90"
      ]
    ]
  },
  {
    "title": "Uber to Jason Daily",
    "date": "2026-08-26",
    "payer": "Krish Shah",
    "currency": "EUR",
    "amount": "70.37",
    "splits": [
      [
        "Akshar Barot",
        "14.07"
      ],
      [
        "Krish Patel",
        "14.07"
      ],
      [
        "Krish Modi",
        "14.07"
      ],
      [
        "Krish Shah",
        "14.07"
      ],
      [
        "Darsh Shah",
        "14.07"
      ]
    ]
  },
  {
    "title": "athens day 2 lunch",
    "date": "2026-08-25",
    "payer": "Krish Modi",
    "currency": "USD",
    "amount": "64.16",
    "splits": [
      [
        "Akshar Barot",
        "12.83"
      ],
      [
        "Krish Patel",
        "12.83"
      ],
      [
        "Krish Modi",
        "12.83"
      ],
      [
        "Krish Shah",
        "12.83"
      ],
      [
        "Darsh Shah",
        "12.83"
      ]
    ]
  },
  {
    "title": "Acropolis Tickets",
    "date": "2026-08-23",
    "payer": "Akshar Barot",
    "currency": "USD",
    "amount": "175.68",
    "splits": [
      [
        "Akshar Barot",
        "35.14"
      ],
      [
        "Krish Patel",
        "35.14"
      ],
      [
        "Krish Modi",
        "35.14"
      ],
      [
        "Krish Shah",
        "35.14"
      ],
      [
        "Darsh Shah",
        "35.14"
      ]
    ]
  },
  {
    "title": "Cavo Paradiso Mykonos",
    "date": "2026-08-23",
    "payer": "Krish Patel",
    "currency": "USD",
    "amount": "497.76",
    "splits": [
      [
        "Akshar Barot",
        "99.55"
      ],
      [
        "Krish Patel",
        "99.55"
      ],
      [
        "Krish Modi",
        "99.55"
      ],
      [
        "Krish Shah",
        "99.55"
      ],
      [
        "Darsh Shah",
        "99.55"
      ]
    ]
  },
  {
    "title": "Acropolis Museum Tickets",
    "date": "2026-08-23",
    "payer": "Krish Patel",
    "currency": "USD",
    "amount": "117.12",
    "splits": [
      [
        "Akshar Barot",
        "23.42"
      ],
      [
        "Krish Patel",
        "23.42"
      ],
      [
        "Krish Modi",
        "23.42"
      ],
      [
        "Krish Shah",
        "23.42"
      ],
      [
        "Darsh Shah",
        "23.42"
      ]
    ]
  },
  {
    "title": "Agora Tickets",
    "date": "2026-08-23",
    "payer": "Krish Patel",
    "currency": "USD",
    "amount": "117.12",
    "splits": [
      [
        "Akshar Barot",
        "23.42"
      ],
      [
        "Krish Patel",
        "23.42"
      ],
      [
        "Krish Modi",
        "23.42"
      ],
      [
        "Krish Shah",
        "23.42"
      ],
      [
        "Darsh Shah",
        "23.42"
      ]
    ]
  },
  {
    "title": "Mykonos last day lockers",
    "date": "2026-08-22",
    "payer": "Krish Modi",
    "currency": "USD",
    "amount": "39.15",
    "splits": [
      [
        "Akshar Barot",
        "7.83"
      ],
      [
        "Krish Patel",
        "7.83"
      ],
      [
        "Krish Modi",
        "7.83"
      ],
      [
        "Krish Shah",
        "7.83"
      ],
      [
        "Darsh Shah",
        "7.83"
      ]
    ]
  },
  {
    "title": "Naxos last day carry on locker",
    "date": "2026-08-22",
    "payer": "Krish Modi",
    "currency": "USD",
    "amount": "37.93",
    "splits": [
      [
        "Akshar Barot",
        "7.59"
      ],
      [
        "Krish Patel",
        "7.59"
      ],
      [
        "Krish Modi",
        "7.59"
      ],
      [
        "Krish Shah",
        "7.59"
      ],
      [
        "Darsh Shah",
        "7.59"
      ]
    ]
  },
  {
    "title": "Athens 3 day check in bags booking",
    "date": "2026-08-22",
    "payer": "Krish Modi",
    "currency": "USD",
    "amount": "94.29",
    "splits": [
      [
        "Krish Modi",
        "31.43"
      ],
      [
        "Darsh Shah",
        "31.43"
      ],
      [
        "Akshar Barot",
        "31.43"
      ]
    ]
  },
  {
    "title": "New York → Athens",
    "date": "2026-08-10",
    "payer": "Akshar Barot",
    "currency": "USD",
    "amount": "422.14",
    "splits": [
      [
        "Akshar Barot",
        "422.14"
      ]
    ]
  },
  {
    "title": "Prague Airbnb",
    "date": "2026-08-10",
    "payer": "Akshar Barot",
    "currency": "USD",
    "amount": "381.81",
    "splits": [
      [
        "Akshar Barot",
        "76.36"
      ],
      [
        "Krish Patel",
        "76.36"
      ],
      [
        "Krish Modi",
        "76.36"
      ],
      [
        "Krish Shah",
        "76.36"
      ],
      [
        "Darsh Shah",
        "76.36"
      ]
    ]
  },
  {
    "title": "Athens Day 2 Hotel",
    "date": "2026-08-10",
    "payer": "Akshar Barot",
    "currency": "USD",
    "amount": "337.55",
    "splits": [
      [
        "Akshar Barot",
        "67.51"
      ],
      [
        "Krish Patel",
        "67.51"
      ],
      [
        "Krish Modi",
        "67.51"
      ],
      [
        "Krish Shah",
        "67.51"
      ],
      [
        "Darsh Shah",
        "67.51"
      ]
    ]
  },
  {
    "title": "Ayia Napa Hotel",
    "date": "2026-08-10",
    "payer": "Akshar Barot",
    "currency": "USD",
    "amount": "305.73",
    "splits": [
      [
        "Akshar Barot",
        "61.15"
      ],
      [
        "Krish Patel",
        "61.15"
      ],
      [
        "Krish Modi",
        "61.15"
      ],
      [
        "Krish Shah",
        "61.15"
      ],
      [
        "Darsh Shah",
        "61.15"
      ]
    ]
  },
  {
    "title": "Mykonos Hotel",
    "date": "2026-08-10",
    "payer": "Akshar Barot",
    "currency": "USD",
    "amount": "806.23",
    "splits": [
      [
        "Akshar Barot",
        "161.25"
      ],
      [
        "Krish Patel",
        "161.25"
      ],
      [
        "Krish Modi",
        "161.25"
      ],
      [
        "Krish Shah",
        "161.25"
      ],
      [
        "Darsh Shah",
        "161.25"
      ]
    ]
  },
  {
    "title": "Naxos Hotel",
    "date": "2026-08-10",
    "payer": "Akshar Barot",
    "currency": "USD",
    "amount": "470.87",
    "splits": [
      [
        "Akshar Barot",
        "94.17"
      ],
      [
        "Krish Patel",
        "94.17"
      ],
      [
        "Krish Modi",
        "94.17"
      ],
      [
        "Krish Shah",
        "94.17"
      ],
      [
        "Darsh Shah",
        "94.17"
      ]
    ]
  },
  {
    "title": "Athens Day 1 Hotel",
    "date": "2026-08-10",
    "payer": "Akshar Barot",
    "currency": "USD",
    "amount": "155.94",
    "splits": [
      [
        "Akshar Barot",
        "31.19"
      ],
      [
        "Krish Patel",
        "31.19"
      ],
      [
        "Krish Modi",
        "31.19"
      ],
      [
        "Krish Shah",
        "31.19"
      ],
      [
        "Darsh Shah",
        "31.19"
      ]
    ]
  },
  {
    "title": "Prague → Madrid Flight",
    "date": "2026-08-10",
    "payer": "Akshar Barot",
    "currency": "USD",
    "amount": "556.80",
    "splits": [
      [
        "Akshar Barot",
        "185.60"
      ],
      [
        "Krish Modi",
        "185.60"
      ],
      [
        "Darsh Shah",
        "185.60"
      ]
    ]
  },
  {
    "title": "Larnaka → Prague Flight",
    "date": "2026-08-10",
    "payer": "Akshar Barot",
    "currency": "USD",
    "amount": "444.92",
    "splits": [
      [
        "Akshar Barot",
        "170.63"
      ],
      [
        "Krish Patel",
        "103.65"
      ],
      [
        "Krish Modi",
        "170.64"
      ]
    ]
  },
  {
    "title": "Athens → Larnaka Flight",
    "date": "2026-08-10",
    "payer": "Akshar Barot",
    "currency": "USD",
    "amount": "706.63",
    "splits": [
      [
        "Akshar Barot",
        "259.54"
      ],
      [
        "Krish Patel",
        "187.55"
      ],
      [
        "Krish Modi",
        "259.54"
      ]
    ]
  },
  {
    "title": "Mykonos → Rafina",
    "date": "2026-08-10",
    "payer": "Akshar Barot",
    "currency": "USD",
    "amount": "142.93",
    "splits": [
      [
        "Akshar Barot",
        "47.64"
      ],
      [
        "Krish Modi",
        "47.64"
      ],
      [
        "Krish Patel",
        "47.64"
      ]
    ]
  },
  {
    "title": "Naxos → Mykonos",
    "date": "2026-08-10",
    "payer": "Akshar Barot",
    "currency": "USD",
    "amount": "167.28",
    "splits": [
      [
        "Akshar Barot",
        "55.76"
      ],
      [
        "Krish Patel",
        "55.76"
      ],
      [
        "Krish Modi",
        "55.76"
      ]
    ]
  },
  {
    "title": "Piraeus → Naxos Ferry",
    "date": "2026-08-10",
    "payer": "Akshar Barot",
    "currency": "USD",
    "amount": "254.19",
    "splits": [
      [
        "Akshar Barot",
        "84.73"
      ],
      [
        "Krish Patel",
        "84.73"
      ],
      [
        "Krish Modi",
        "84.73"
      ]
    ]
  },
  {
    "title": "AirBnb in Amsterdam (CAD CONVERTED)",
    "date": "2026-08-10",
    "payer": "Krish Patel",
    "currency": "USD",
    "amount": "238.36",
    "splits": [
      [
        "Krish Shah",
        "119.18"
      ],
      [
        "Krish Patel",
        "119.18"
      ]
    ]
  },
  {
    "title": "Flight to Toronto (Plus Seat)",
    "date": "2026-08-10",
    "payer": "Krish Patel",
    "currency": "USD",
    "amount": "767.18",
    "splits": [
      [
        "Krish Shah",
        "417.59"
      ],
      [
        "Krish Patel",
        "349.59"
      ]
    ]
  },
  {
    "title": "Flight to Amsterdam",
    "date": "2026-08-10",
    "payer": "Krish Patel",
    "currency": "USD",
    "amount": "260.18",
    "splits": [
      [
        "Krish Shah",
        "130.09"
      ],
      [
        "Krish Patel",
        "130.09"
      ]
    ]
  },
  {
    "title": "Naxos Day Boat Trip - Aug 26",
    "date": "2026-08-10",
    "payer": "Krish Patel",
    "currency": "USD",
    "amount": "530.20",
    "splits": [
      [
        "Akshar Barot",
        "106.04"
      ],
      [
        "Krish Patel",
        "106.04"
      ],
      [
        "Krish Modi",
        "106.04"
      ],
      [
        "Krish Shah",
        "106.04"
      ],
      [
        "Darsh Shah",
        "106.04"
      ]
    ]
  }
]
$expenses$::jsonb;

  target_room public.rooms%rowtype;
  expense_row record;
  split_row record;
  participant_name text;
  actor_member_id uuid;
  payer_member_id uuid;
  split_member_id uuid;
  expense_id uuid;
  expense_date date;
  expense_amount numeric(20, 6);
  expense_base_amount numeric(20, 6);
  expense_currency text;
  expense_rate numeric(24, 12);
  split_count integer;
  split_amount numeric(20, 6);
  split_base_amount numeric(20, 6);
  assigned_amount numeric(20, 6);
  assigned_base_amount numeric(20, 6);
  imported_count integer;
begin
  if target_code = 'PASTE-ROOM-CODE-HERE' then
    raise exception 'Replace PASTE-ROOM-CODE-HERE with the room code from the URL before running this script.';
  end if;

  select *
  into target_room
  from public.rooms
  where code = upper(trim(target_code));

  if not found then
    raise exception 'No Sendit room found for code %.', upper(trim(target_code));
  end if;

  if target_room.base_currency <> 'USD' then
    raise exception
      'This export is accounted in USD, but room % uses %.',
      target_room.code,
      target_room.base_currency;
  end if;

  actor_member_id := target_room.creator_member_id;

  -- The old demo room commonly used "Akshar" for its creator. Preserve the
  -- identity/device link by renaming that same participant when possible.
  if not exists (
    select 1
    from public.room_members
    where room_id = target_room.id
      and name = 'Akshar Barot'
  ) then
    update public.room_members
    set name = 'Akshar Barot',
        preferred_currency = 'USD',
        is_archived = false,
        merged_into = null
    where id = target_room.creator_member_id
      and room_id = target_room.id
      and name = 'Akshar';
  end if;

  -- Remove only the original Sendit demo ledger and prior runs of this import.
  delete from public.transfers
  where room_id = target_room.id
    and note like '[Demo]%';

  delete from public.expenses
  where room_id = target_room.id
    and title like '[Demo]%';

  delete from public.expenses
  where room_id = target_room.id
    and id in (
      select md5(
        'sendit-legacy-trip-2026|'
        || target_room.id::text
        || '|'
        || imported.item_number::text
      )::uuid
      from jsonb_array_elements(seed_data) with ordinality
        as imported(item, item_number)
    );

  -- Remove unclaimed participants created solely by the earlier sample seed.
  delete from public.room_members as member
  where member.room_id = target_room.id
    and member.name in ('Maya (sample)', 'Noah (sample)', 'Priya (sample)')
    and member.id <> target_room.creator_member_id
    and not exists (
      select 1
      from public.member_identities as identity
      where identity.member_id = member.id
    )
    and not exists (
      select 1
      from public.expenses as expense
      where expense.paid_by_member_id = member.id
         or expense.created_by_member_id = member.id
         or expense.updated_by_member_id = member.id
    )
    and not exists (
      select 1
      from public.expense_splits as split
      where split.member_id = member.id
    )
    and not exists (
      select 1
      from public.transfers as transfer
      where transfer.from_member_id = member.id
         or transfer.to_member_id = member.id
         or transfer.created_by_member_id = member.id
         or transfer.updated_by_member_id = member.id
    );

  -- Add or reactivate the five people from the export.
  for participant_name in
    select value
    from jsonb_array_elements_text(participant_names)
  loop
    insert into public.room_members (
      room_id,
      name,
      preferred_currency,
      is_archived,
      merged_into
    )
    values (
      target_room.id,
      participant_name,
      'USD',
      false,
      null
    )
    on conflict (room_id, name) do update
    set is_archived = false,
        merged_into = null;
  end loop;

  for expense_row in
    select item, item_number
    from jsonb_array_elements(seed_data) with ordinality
      as expenses(item, item_number)
    order by item_number
  loop
    expense_id := md5(
      'sendit-legacy-trip-2026|'
      || target_room.id::text
      || '|'
      || expense_row.item_number::text
    )::uuid;
    expense_date := (expense_row.item->>'date')::date;
    expense_amount := (expense_row.item->>'amount')::numeric;
    expense_currency := expense_row.item->>'currency';
    expense_rate := case
      when expense_currency = 'USD' then 1
      when expense_currency = 'EUR' and expense_date = date '2026-08-26'
        then eur_to_usd_rate
      else null
    end;

    if expense_rate is null then
      raise exception
        'No locked FX rate configured for % on %.',
        expense_currency,
        expense_date;
    end if;

    expense_base_amount := round(expense_amount * expense_rate, 2);

    select id
    into payer_member_id
    from public.room_members
    where room_id = target_room.id
      and name = expense_row.item->>'payer'
      and merged_into is null;

    if payer_member_id is null then
      raise exception 'Payer % was not found.', expense_row.item->>'payer';
    end if;

    insert into public.expenses (
      id,
      room_id,
      title,
      description,
      expense_date,
      amount,
      currency,
      base_amount,
      paid_by_member_id,
      split_mode,
      fx_rate,
      fx_requested_date,
      fx_effective_date,
      fx_source,
      created_by_member_id,
      updated_by_member_id,
      created_at,
      updated_at
    )
    values (
      expense_id,
      target_room.id,
      expense_row.item->>'title',
      null,
      expense_date,
      expense_amount,
      expense_currency,
      expense_base_amount,
      payer_member_id,
      'exact',
      expense_rate,
      expense_date,
      expense_date,
      case when expense_currency = 'USD' then 'identity' else 'frankfurter' end,
      actor_member_id,
      actor_member_id,
      ((expense_date::text || ' 12:00:00+00')::timestamptz),
      ((expense_date::text || ' 12:00:00+00')::timestamptz)
    );

    split_count := jsonb_array_length(expense_row.item->'splits');
    assigned_amount := 0;
    assigned_base_amount := 0;

    if split_count = 0 then
      raise exception 'Expense % has no split rows.', expense_row.item->>'title';
    end if;

    for split_row in
      select item, item_number
      from jsonb_array_elements(expense_row.item->'splits') with ordinality
        as splits(item, item_number)
      order by item_number
    loop
      select id
      into split_member_id
      from public.room_members
      where room_id = target_room.id
        and name = split_row.item->>0
        and merged_into is null;

      if split_member_id is null then
        raise exception 'Split participant % was not found.', split_row.item->>0;
      end if;

      if split_row.item_number = split_count then
        split_amount := expense_amount - assigned_amount;
        split_base_amount := expense_base_amount - assigned_base_amount;
      else
        split_amount := (split_row.item->>1)::numeric;
        split_base_amount := round(split_amount * expense_rate, 6);
      end if;

      if split_amount < 0 or split_base_amount < 0 then
        raise exception 'Invalid split generated for expense %.', expense_row.item->>'title';
      end if;

      insert into public.expense_splits (
        room_id,
        expense_id,
        member_id,
        amount,
        base_amount
      )
      values (
        target_room.id,
        expense_id,
        split_member_id,
        split_amount,
        split_base_amount
      );

      assigned_amount := assigned_amount + split_amount;
      assigned_base_amount := assigned_base_amount + split_base_amount;
    end loop;
  end loop;

  -- Mirror convertAndAllocate() from lib/money.ts: allocate the rounded base
  -- total in integer cents, then distribute leftover cents by fractional
  -- remainder with member UUID as the deterministic tie-breaker.
  with imported_expenses as (
    select expense.id
    from public.expenses as expense
    where expense.room_id = target_room.id
      and expense.id in (
        select md5(
          'sendit-legacy-trip-2026|'
          || target_room.id::text
          || '|'
          || imported.item_number::text
        )::uuid
        from jsonb_array_elements(seed_data) with ordinality
          as imported(item, item_number)
      )
  ),
  provisional as (
    select
      split.id as split_id,
      split.expense_id,
      split.member_id,
      expense.base_amount * 100 as total_minor,
      floor(
        expense.base_amount * 100 * split.amount / expense.amount
      ) as floor_minor,
      expense.base_amount * 100 * split.amount / expense.amount
        - floor(expense.base_amount * 100 * split.amount / expense.amount)
        as fractional_remainder
    from public.expense_splits as split
    join public.expenses as expense on expense.id = split.expense_id
    join imported_expenses on imported_expenses.id = expense.id
  ),
  ranked as (
    select
      provisional.*,
      sum(floor_minor) over (partition by expense_id) as floor_total,
      row_number() over (
        partition by expense_id
        order by fractional_remainder desc, member_id::text
      ) as remainder_rank
    from provisional
  ),
  allocations as (
    select
      split_id,
      (
        floor_minor
        + case
            when remainder_rank <= total_minor - floor_total then 1
            else 0
          end
      ) / 100 as base_amount
    from ranked
  )
  update public.expense_splits as split
  set base_amount = allocations.base_amount
  from allocations
  where split.id = allocations.split_id;

  select count(*)
  into imported_count
  from public.expenses
  where room_id = target_room.id
    and id in (
      select md5(
        'sendit-legacy-trip-2026|'
        || target_room.id::text
        || '|'
        || imported.item_number::text
      )::uuid
      from jsonb_array_elements(seed_data) with ordinality
        as imported(item, item_number)
    );

  if imported_count <> jsonb_array_length(seed_data) then
    raise exception
      'Import verification failed: expected % expenses, found %.',
      jsonb_array_length(seed_data),
      imported_count;
  end if;

  if exists (
    select 1
    from public.expenses as expense
    where expense.room_id = target_room.id
      and expense.id in (
        select md5(
          'sendit-legacy-trip-2026|'
          || target_room.id::text
          || '|'
          || imported.item_number::text
        )::uuid
        from jsonb_array_elements(seed_data) with ordinality
          as imported(item, item_number)
      )
      and (
        expense.amount <> (
          select coalesce(sum(split.amount), 0)
          from public.expense_splits as split
          where split.expense_id = expense.id
        )
        or expense.base_amount <> (
          select coalesce(sum(split.base_amount), 0)
          from public.expense_splits as split
          where split.expense_id = expense.id
        )
      )
  ) then
    raise exception 'Import verification failed: one or more split totals do not balance.';
  end if;

  raise notice
    'Imported % expenses into room % (%).',
    imported_count,
    target_room.name,
    target_room.code;
end;
$seed$;
