import Image from 'next/image';
import styles from './Volunteering.module.css';
import peaceLogo from '../assets/peace circuit.png';

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
    <section id="volunteering" className={styles.volunteering}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>Volunteering</h2>

        <div className={styles.card}>
          {/* Organization */}
          <div className={styles.orgRow}>
            <div className={styles.orgLogo}>
              <Image
                src={org.logo}
                alt={org.name}
                className={styles.logoImg}
                width={100}
                height={100}
                sizes="(max-width: 480px) 72px, (max-width: 768px) 88px, 100px"
              />
            </div>
            <div className={styles.orgInfo}>
              <h3 className={styles.orgName}>{org.name}</h3>
              <p className={styles.orgField}>{org.field}</p>
            </div>
          </div>
          <p className={styles.orgDescription}>{org.description}</p>

          <div className={styles.divider} />

          {/* Roles */}
          <h4 className={styles.rolesLabel}>My Roles</h4>
          <div className={styles.rolesList}>
            {roles.map((role, idx) => (
              <div key={idx} className={styles.roleItem}>
                <p className={styles.roleTitle}>{role.title}</p>
                <ul className={styles.contributions}>
                  {role.contributions.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
