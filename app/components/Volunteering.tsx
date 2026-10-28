import Image from 'next/image';
import styles from './Volunteering.module.css';
import peaceLogo from '../assets/peace-circuit.webp';
import Reveal from './motion/Reveal';

export default function Volunteering() {
  return (
    <section id="volunteering" className="section" aria-labelledby="volunteering-title">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow" data-index="07">Volunteering</p>
          <h2 id="volunteering-title" className="section-title">
            Giving Back
          </h2>
        </Reveal>

        <Reveal className={`card ${styles.card}`}>
          <Image
            src={peaceLogo}
            alt="Peace Circuit logo"
            className={styles.logo}
            width={72}
            height={72}
            sizes="72px"
            placeholder="blur"
          />
          <div>
            <h3 className={styles.orgName}>Peace Circuit</h3>
            <p className={styles.orgField}>Co-founder · Website maintainer · Digital-safety trainer</p>
            <p className={styles.text}>
              I maintain the website and support the IT team of Peace Circuit, a network working at
              the intersection of peacebuilding and technology. I also run digital-safety training
              sessions that help participants protect themselves and their communities online.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
