import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Heart } from "lucide-react";

/** An interactive explanation, not a quote or a payment form. */
export function PaymentPlayground() {
  const [asset, setAsset] = useState<"NGNT" | "XLM">("NGNT");
  const reduce = useReducedMotion();
  return (
    <figure className="payment-playground">
      <div className="playground-scene">
        <svg
          className="playground-landscape"
          viewBox="0 0 1200 430"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="sky"
              x1="600"
              y1="0"
              x2="600"
              y2="430"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#D4E7EF" />
              <stop offset="1" stopColor="#E6EEEA" />
            </linearGradient>
            <linearGradient
              id="pipe"
              x1="120"
              y1="180"
              x2="460"
              y2="300"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#FEB292" />
              <stop offset=".5" stopColor="#FF7950" />
              <stop offset="1" stopColor="#E96742" />
            </linearGradient>
            <linearGradient
              id="coin"
              x1="0"
              y1="-55"
              x2="0"
              y2="55"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#FFE194" />
              <stop offset="1" stopColor="#E9B741" />
            </linearGradient>
          </defs>
          <path fill="url(#sky)" d="M0 0h1200v430H0z" />
          <circle cx="965" cy="81" r="41" fill="#FAE8B2" />
          <path
            d="M0 271C130 180 239 197 351 283C510 405 649 166 830 256C988 335 1084 176 1200 228V430H0Z"
            fill="#B2C7A0"
          />
          <path
            d="M0 335C158 278 283 357 456 327C632 296 777 282 944 342C1041 378 1143 307 1200 299V430H0Z"
            fill="#86A27B"
          />
          <path
            d="M0 397C160 349 272 421 440 389C650 347 821 365 1200 410V430H0Z"
            fill="#6D8D69"
          />
          <ellipse cx="601" cy="356" rx="220" ry="20" fill="#365B4133" />
          <ellipse cx="229" cy="351" rx="118" ry="13" fill="#365B4126" />
          <ellipse cx="963" cy="344" rx="128" ry="14" fill="#365B4126" />
          <path
            d="M153 148V228Q153 282 210 282H435"
            stroke="#BF583B"
            strokeWidth="43"
            strokeLinecap="round"
          />
          <path
            d="M146 141V221Q146 275 203 275H428"
            stroke="url(#pipe)"
            strokeWidth="40"
            strokeLinecap="round"
          />
          <path
            d="M146 142V221Q146 272 203 272H426"
            stroke="#FFBD9B"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <ellipse cx="147" cy="141" rx="28" ry="13" fill="#EC7149" />
          <ellipse cx="147" cy="141" rx="17" ry="7" fill="#9F4F34" />
          <path
            d="M764 274H892Q952 274 952 214V181"
            stroke="#4E6C95"
            strokeWidth="43"
            strokeLinecap="round"
          />
          <path
            d="M759 267H885Q945 267 945 207V174"
            stroke="#8BAED0"
            strokeWidth="40"
            strokeLinecap="round"
          />
          <path
            d="M761 258H886Q936 258 936 206V176"
            stroke="#C3D8E8"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <motion.path
            d="M203 275H428M760 267H885Q945 267 945 207V174"
            stroke="#FFF3CD"
            strokeWidth="3"
            strokeDasharray="3 14"
            initial={{ pathLength: reduce ? 1 : 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 2.2, delay: 0.4 }}
          />
          <motion.g
            initial={{ y: reduce ? 0 : 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", duration: 1.1, bounce: 0.15 }}
          >
            <path
              d="M433 155L492 126H772L774 319L718 352H433Z"
              fill="#426955"
            />
            <path d="M433 155L492 126H772L718 155Z" fill="#DBE4C5" />
            <rect
              x="419"
              y="149"
              width="303"
              height="196"
              rx="20"
              fill="#F6F0DC"
              stroke="#52745A"
              strokeWidth="2"
            />
            <rect
              x="440"
              y="172"
              width="262"
              height="116"
              rx="11"
              fill="#D7E0C5"
            />
            <rect
              x="449"
              y="180"
              width="244"
              height="100"
              rx="7"
              fill="#EFF1DB"
            />
            <text
              x="571"
              y="213"
              textAnchor="middle"
              fontSize="13"
              fill="#627A58"
              fontFamily="DM Sans, sans-serif"
            >
              A little love, sent a long way.
            </text>
            <text
              x="571"
              y="254"
              textAnchor="middle"
              fontSize="34"
              fill="#35543D"
              fontFamily="DM Sans, sans-serif"
              fontWeight="500"
            >
              {asset} → USDC
            </text>
            <circle cx="462" cy="316" r="8" fill="#FF7950" />
            <circle cx="487" cy="316" r="8" fill="#A9B990" />
            <path
              d="M650 310H682M650 317H682M650 324H682"
              stroke="#8EA17D"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <text
              x="573"
              y="320"
              textAnchor="middle"
              fontFamily="DM Sans, sans-serif"
              fontSize="16"
              fontWeight="600"
              fill="#435B3E"
            >
              pact.
            </text>
          </motion.g>
          <g transform="translate(146 88)">
            <AnimatePresence mode="wait" initial={false}>
              <motion.g
                key={asset}
                initial={{
                  y: reduce ? 0 : -20,
                  opacity: 0,
                  rotate: reduce ? 0 : -15,
                }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={{ y: reduce ? 0 : 30, opacity: 0 }}
                transition={{ duration: 0.45 }}
              >
                <circle cx="5" cy="5" r="34" fill="#527E61" />
                <circle
                  r="34"
                  fill={asset === "NGNT" ? "#B7D4A7" : "#D6C9EB"}
                  stroke="#F2F3D9"
                  strokeWidth="3"
                />
                <text
                  y="11"
                  textAnchor="middle"
                  fontFamily="DM Sans, sans-serif"
                  fontSize="31"
                  fill="#3C654B"
                >
                  {asset === "NGNT" ? "₦" : "✦"}
                </text>
              </motion.g>
            </AnimatePresence>
          </g>
          <motion.g
            initial={{ opacity: 0, y: reduce ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7, duration: 0.75 }}
          >
            <g transform="translate(949 115) rotate(10)">
              <ellipse cx="7" cy="5" rx="48" ry="52" fill="#C98D31" />
              <ellipse
                rx="48"
                ry="52"
                fill="url(#coin)"
                stroke="#FFEDB9"
                strokeWidth="3"
              />
              <ellipse rx="37" ry="41" stroke="#B98637" strokeWidth="1.5" />
              <text
                y="19"
                textAnchor="middle"
                fontFamily="DM Sans, sans-serif"
                fontSize="55"
                fill="#926024"
              >
                $
              </text>
            </g>
          </motion.g>
          <g transform="translate(1046 255)">
            <path d="M0 88V8" stroke="#40664D" strokeWidth="7" />
            <path
              d="M0 68C-52 70-64 37-61 21C-20 19-2 40 0 68Z"
              fill="#52785A"
            />
            <path d="M1 46C47 42 60 13 54 0C19 4 3 20 1 46Z" fill="#C3D399" />
          </g>
          <g transform="translate(339 207) rotate(-15)">
            <path d="M0 94V9" stroke="#4B7351" strokeWidth="6" />
            <path
              d="M0 60C-40 56-48 34-43 20C-15 23 0 40 0 60Z"
              fill="#567D52"
            />
            <circle r="23" fill="#BEABD2" />
            <circle cx="21" cy="13" r="23" fill="#BEABD2" />
            <circle cx="13" cy="37" r="23" fill="#BEABD2" />
            <circle cx="-14" cy="35" r="23" fill="#BEABD2" />
            <circle cx="-23" cy="10" r="23" fill="#BEABD2" />
            <circle cy="15" r="14" fill="#F6D36E" />
          </g>
          <g fill="#F3F0DA" opacity=".8">
            <ellipse cx="324" cy="55" rx="37" ry="12" />
            <ellipse cx="350" cy="48" rx="28" ry="17" />
            <ellipse cx="374" cy="56" rx="26" ry="10" />
            <ellipse cx="783" cy="70" rx="25" ry="9" />
            <ellipse cx="803" cy="65" rx="20" ry="13" />
          </g>
        </svg>
        <motion.div
          className="playground-sticker"
          initial={{ opacity: 0, rotate: reduce ? 0 : -12, y: reduce ? 0 : 12 }}
          whileInView={{ opacity: 1, rotate: -5, y: 0 }}
          viewport={{ once: true }}
          transition={{
            delay: 0.4,
            type: "spring",
            duration: 0.75,
            bounce: 0.2,
          }}
        >
          <Heart size={17} fill="currentColor" />
          <span>
            Made of
            <br />
            <strong>human connection.</strong>
          </span>
        </motion.div>
        <div className="playground-receipt">
          <span className="mini-receipt-check">
            <Check size={13} />
          </span>
          <div>
            <span>Creator receives</span>
            <strong>
              5.00 <small>USDC</small>
            </strong>
          </div>
          <span className="receipt-caption">Illustration</span>
        </div>
      </div>
      <figcaption>
        <div className="playground-switch">
          <span>Your fan pays in</span>
          <div role="group" aria-label="Illustrate a payment asset">
            {(["NGNT", "XLM"] as const).map((value) => (
              <button
                type="button"
                key={value}
                onClick={() => setAsset(value)}
                aria-pressed={asset === value}
              >
                {value === "NGNT" ? "₦" : "✦"} {value}
              </button>
            ))}
          </div>
        </div>
        <span className="playground-caption">
          <ArrowRight size={15} />
          You receive USDC.<span>One atomic transaction.</span>
        </span>
        <small>Concept preview. No money moves.</small>
      </figcaption>
    </figure>
  );
}
