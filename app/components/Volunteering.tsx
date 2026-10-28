import Image from 'next/image';
import styles from './Volunteering.module.css';
import peaceLogo from '../assets/peace-circuit.webp';
import Reveal from './motion/Reveal';

export default function Volunteering() {
  const org = {
    name: 'Peace Circuit',
    logo: peaceLogo,
    field: 'Peacebuilding · Technology',
    description:
      'Peace Circuit is a network that works at the intersection of peacebuilding and technology. Its mission is to provide a safe space where women from different countries learn, share, and find solutions to their needs through exchange. Peace Circuit promotes change in three main areas: memory and justice, psychosocial accompaniment, and empowering women as peacebuilders.',
  };

  const roles = [
    {
      title: 'Co-Founder & Board of Trustees Member',
      contributions: [
        'Co-founded the organization and serve as a Board of Trustees member, helping shape its strategic direction and governance.',
        'Provide technical support to the IT team and contribute to the development and maintenance of the organization\'s website.',
      ],
    },
    {
      title: 'Digital Safety Trainer',
      contributions: [
        'Deliver training sessions on digital safety, helping participants protect themselves and their communities online.',
      ],
    },
    {
      title: 'Volunteer Trainee',
      contributions: [
        'Participated in training programs covering citizenship, human rights, and advocacy — the foundation that led to deeper involvement with the organization.',
      ],
    },
  ];

  return (
    <section id="volunteering" className="section">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow" data-index="07">Volunteering</p>
          <h2 className="section-title">Giving Back</h2>
        </Reveal>

        <Reveal className={`card ${styles.card}`}>
          <div className={styles.org}>
            <div className={styles.orgRow}>
              <Image
                src={org.logo}
                alt={`${org.name} logo`}
                className={styles.logo}
                width={72}
                height={72}
                sizes="72px"
                placeholder="blur"
              />
              <div>
                <h3 className={styles.orgName}>{org.name}</h3>
                <p className={styles.orgField}>{org.field}</p>
              </div>
            </div>
            <p className={styles.orgDescription}>{org.description}</p>
          </div>

          <div className={styles.roles}>
            <h4 className={styles.rolesLabel}>My Roles</h4>
            <ul className={styles.rolesList}>
              {roles.map((role) => (
                <li key={role.title} className={styles.role}>
                  <p className={styles.roleTitle}>{role.title}</p>
                  <ul className={styles.contributions}>
                    {role.contributions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
